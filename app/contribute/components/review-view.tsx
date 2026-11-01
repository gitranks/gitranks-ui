import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  ApprovalPanel,
  ChecksPanel,
  CostPanel,
  OwnAgentPanel,
  ReadinessPanel,
  ResultPanel,
  TimelinePanel,
} from './attempt-panels';
import { SessionsList } from './attempt-sessions';
import { AttemptStatus, FollowUpOfLink, justOpened, PullRequestStatus } from './attempt-status';
import { DiffViewer } from './diff-viewer';
import { FollowUpApproval } from './follow-up-approval';
import { StartFollowUpButton } from './follow-up-buttons';
import { FollowUpResult } from './follow-up-result';
import { PrConventionsCard } from './pr-conventions-card';
import { PrSignals } from './pr-follow-ups';
import { PrForm } from './pr-form';
import { HEADING, Pill } from './primitives';
import { ReplyDrafts } from './reply-drafts';
import { ReviewFeedbackCard } from './review-feedback';
import { SendBackForm } from './send-back-form';
import { type SessionTab, SessionTabs } from './session-tabs';
import { SubmitPanel } from './submit-panel';
import { attemptTitleOf, editableBodyOf, githubUrlOf, isOwnAgent, repoOf } from '@/lib/contribute/attempt-format';
import { loadAttempt, loadContribute, loadResolveHumanThreads } from '@/lib/contribute/contribute.data';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import { isContributePageOpen } from '@/lib/contribute/contribute-state';
import { hasOutcomes } from '@/lib/contribute/follow-up-flow';
import { usd } from '@/lib/contribute/format';
import { GRANT_BOUNCES } from '@/lib/contribute/grant-resume';
import { parsePatch } from '@/lib/contribute/patch';
import { withoutDraftMarks } from '@/lib/contribute/pr-conventions';
import {
  attemptPath,
  NEXT_SESSION,
  nextRoundOpen,
  nextSessionPath,
  sessionsOf,
  waitingThreadsOf,
} from '@/lib/contribute/sessions';
import { cn } from '@/lib/utils';

export async function ReviewView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const [{ id }, { session }] = await Promise.all([params, searchParams]);
  const [view, attempt, resolveHumans] = await Promise.all([
    loadContribute(),
    loadAttempt(id),
    loadResolveHumanThreads(),
  ]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'attempt')) redirect('/contribute');
  if (attempt === null) notFound();
  // A round's page lists its pull request's sessions: those are the first attempt's to tell.
  const firstId = attempt?.kind === 'FOLLOW_UP' ? attempt.followUpOf?.attemptId : undefined;
  const first = firstId ? await loadAttempt(firstId).catch(() => undefined) : undefined;
  return (
    <ReviewScreen
      view={view}
      attempt={attempt}
      first={first ?? undefined}
      next={session === NEXT_SESSION}
      resolveHumans={resolveHumans}
    />
  );
}

/**
 * The submit asks for GitHub access first: it is not connected, or the last submit bounced for want of it (revoked on
 * GitHub, say). A bounce for a missing grant asks no more once it is connected again (in Settings, say); a revoked one
 * still does, as only GitHub knows it. Not while it cannot be granted here, nor while the API does not answer the grant.
 */
export const grantNeededOf = (view: ContributeView, attempt: ContributeAttemptDetail): boolean => {
  const reason = attempt.submit?.lastError?.reason ?? '';
  const bounced = GRANT_BOUNCES.has(reason) && !(reason === 'grant_missing' && view.grant?.connected === true);
  return view.grantAvailable && (view.grant?.connected === false || bounced);
};

const BackLink = () => (
  <Link href="/contribute/me" prefetch={false} className="text-sm font-semibold text-link">
    ← My contributions
  </Link>
);

/** The pull request's states its first attempt settles in: the header says them, so its session adds no box. */
const PR_SETTLED = new Set(['PR_OPEN', 'FOLLOW_UP', 'MERGED', 'CLOSED']);

/**
 * "Needs you" under the header: what waits for the user on the open pull request, each with its way out (the comments
 * to choose for the next round, the repo's rules to fix, what changed on GitHub); nothing when nothing waits.
 */
function NeedsYouStrip({ first, next, now }: { first: ContributeAttemptDetail; next: boolean; now?: Date }) {
  const pr = first.pullRequest;
  if (!pr || pr.state !== 'OPEN' || first.kind !== 'FIRST') return null;
  const waiting = waitingThreadsOf(first).length;
  const signals = first.needsYou?.signals.length ?? 0;
  const rules = !!first.prIssues?.length || !!first.prFix;
  if (!waiting && !signals && !rules) return null;
  const round = (first.followUps?.used ?? 0) + 1;

  return (
    <section
      aria-labelledby="attempt-needs"
      data-needs-you=""
      className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-brand-soft p-4"
    >
      <h2 id="attempt-needs" className={HEADING.card}>
        Needs you
      </h2>
      {waiting ? (
        <div
          data-waiting={waiting}
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-background px-3.5 py-2.5 text-sm"
        >
          <Pill tone="amber">Review comments</Pill>
          <span className="min-w-0 flex-1">
            {waiting === 1 ? '1 comment waits' : `${waiting} comments wait`} for an answer on #{pr.number}.
          </span>
          {nextRoundOpen(first) && next ? (
            <span className="text-muted-foreground">Choose below what round {round} addresses.</span>
          ) : nextRoundOpen(first) ? (
            <Link
              href={nextSessionPath(first.attemptId)}
              prefetch={false}
              scroll={false}
              className="font-semibold text-link"
            >
              Choose what round {round} addresses →
            </Link>
          ) : (
            <span className="text-muted-foreground">
              {first.followUps?.currentAttemptId
                ? 'A follow-up is under way on these comments.'
                : 'Every follow-up round is used: answer these on GitHub.'}
            </span>
          )}
        </div>
      ) : null}
      {signals ? (
        <div className="rounded-lg border bg-background px-3.5 py-2.5">
          <PrSignals needsYou={first.needsYou} now={now} prId={pr.prId} prNumber={pr.number} />
        </div>
      ) : null}
      {rules ? (
        <PrConventionsCard
          attemptId={first.attemptId}
          prNumber={pr.number}
          issues={first.prIssues ?? []}
          fix={first.prFix ?? null}
          title={first.prTitle ?? first.approval?.title ?? ''}
          body={editableBodyOf(first.prBody ?? first.approval?.body ?? first.result?.prBody)}
          conventions={first.conventions ?? null}
        />
      ) : null}
    </section>
  );
}

/** The round that has not started: the comments to choose, or with none waiting, the button that starts it. */
function NextRound({ first, view, now }: { first: ContributeAttemptDetail; view: ContributeView; now?: Date }) {
  const pr = first.pullRequest;
  if (!pr) return null;
  const feedback = first.reviewFeedback;
  const cap = view.contributor?.settings?.attemptCapUsd;
  if (feedback?.threads.length) {
    return (
      <ReviewFeedbackCard
        // A thread arriving in a later read starts the choices afresh: none is shown chosen but left out.
        key={feedback.threads.map((thread) => thread.commentId).join(',')}
        prId={pr.prId}
        prNumber={pr.number}
        feedback={feedback}
        canStart
        blocked={null}
        attemptCapUsd={cap}
        now={now}
      />
    );
  }
  return (
    <section data-next-round="" className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
      <h2 className={HEADING.card}>Round {(first.followUps?.used ?? 0) + 1}</h2>
      <p className="text-sm text-muted-foreground">
        No review comment waits on #{pr.number}. A round still reads the reviews, comments and failing checks, adds
        commits and drafts replies, on your Claude key
        {typeof cap === 'number' ? ` within your ${usd(cap)} limit for one attempt` : ''}. Nothing is pushed or posted
        before you review it.
      </p>
      <StartFollowUpButton prId={pr.prId} />
    </section>
  );
}

/** One session's details, a tab each: what it did, its changes, its checks, and what it cost and when. */
function SessionDetails({
  attempt,
  view,
  now,
  resolveHumans,
}: {
  attempt: ContributeAttemptDetail;
  view: ContributeView;
  now?: Date;
  resolveHumans?: boolean;
}) {
  const repo = repoOf(attempt);
  const inReview = attempt.state === 'REVIEW';
  const followUp = attempt.kind === 'FOLLOW_UP';
  const ownAgent = isOwnAgent(attempt);
  const prNumber = followUp ? (attempt.followUpOf?.number ?? null) : (attempt.pullRequest?.number ?? null);
  // The follow-up flow: one card per thread with its outcome, and one approval (an older API: the drafts). An API with
  // the flow answers `checkStatus` (null before the checks), so a round with no reply is one too.
  const flow = followUp && (attempt.checkStatus !== undefined || hasOutcomes(attempt.replyDrafts));
  const files = parsePatch(attempt.patch).files.length;
  const checks = attempt.checksPassed === true ? '✓' : attempt.checksPassed === false ? '✗' : undefined;

  const replies: ReactNode = flow ? (
    <FollowUpResult
      // A push that came back to the review starts the card afresh (its buttons on again).
      key={`${attempt.state}|${attempt.submit?.lastError?.at ?? ''}`}
      attempt={attempt}
      prNumber={prNumber}
      resolveHumans={resolveHumans}
    />
  ) : (
    <ReplyDrafts
      drafts={attempt.replyDrafts}
      prNumber={prNumber}
      followUps={new Map([[attempt.attemptId, attempt]])}
      freshness={[attempt.state, attempt.updatedAt].join('|')}
      now={now}
    />
  );
  // A first attempt's own drafts, from an API before the flow: kept where they were read, under its summary.
  const firstDrafts = !followUp && attempt.pullRequest && attempt.replyDrafts?.length;

  const tabs: SessionTab[] = [
    followUp
      ? {
          value: 'replies',
          label: 'Replies',
          badge: attempt.replyDrafts?.length || undefined,
          content: (
            <>
              <ResultPanel attempt={attempt} />
              {replies}
            </>
          ),
        }
      : {
          value: 'summary',
          label: 'Summary',
          content: (
            <>
              <ResultPanel attempt={attempt} />
              {ownAgent ? <OwnAgentPanel attempt={attempt} now={now} /> : null}
              <ApprovalPanel attempt={attempt} />
              {firstDrafts ? (
                <ReplyDrafts
                  drafts={attempt.replyDrafts}
                  prNumber={prNumber}
                  freshness={[attempt.state, attempt.updatedAt, attempt.followUps?.currentAttemptId ?? ''].join('|')}
                  now={now}
                />
              ) : null}
            </>
          ),
        },
    {
      value: 'changes',
      label: 'Changes',
      badge: files ? `${files} ${files === 1 ? 'file' : 'files'}` : undefined,
      content: <DiffViewer patch={attempt.patch} title={followUp ? 'The new commits' : 'Diff'} />,
    },
    {
      value: 'checks',
      label: 'Checks',
      badge: checks,
      content: (
        <>
          <ChecksPanel attempt={attempt} />
          <ReadinessPanel attempt={attempt} />
        </>
      ),
    },
    {
      value: 'activity',
      label: 'Activity',
      content: (
        <>
          {ownAgent ? null : <CostPanel attempt={attempt} />}
          <TimelinePanel attempt={attempt} />
        </>
      ),
    },
  ];
  // The review opens on the change itself; a round, on what it did with the comments.
  const opening = followUp ? 'replies' : inReview || attempt.state === 'PENDING_AUTOSUBMIT' ? 'changes' : 'summary';
  const showStatus = followUp || !PR_SETTLED.has(attempt.state) || justOpened(attempt.pullRequest, now);

  return (
    <div className="flex min-w-0 flex-col gap-4" data-session-details={attempt.attemptId}>
      {showStatus ? <AttemptStatus attempt={attempt} now={now} /> : null}
      {inReview && !followUp ? (
        <SubmitPanel open={!!attempt.submit?.lastError}>
          <PrForm
            attemptId={attempt.attemptId}
            issueNumber={attempt.number}
            repo={repo}
            defaultTitle={
              // Each candidate without its WIP or draft marks: one that is nothing but a mark gives way.
              [attempt.approval?.title, attempt.result?.prTitle, attempt.title]
                .map((title) => withoutDraftMarks(title ?? ''))
                .find(Boolean) ?? `Fix #${attempt.number}`
            }
            defaultBody={editableBodyOf(attempt.approval?.body ?? attempt.result?.prBody)}
            login={view.contributor?.login ?? 'you'}
            dcoMode={view.contributor?.settings?.dco ?? null}
            dcoRequired={attempt.dcoRequired}
            again={!!attempt.submit?.lastError}
            grantNeeded={grantNeededOf(view, attempt)}
            grantConnected={view.grant?.connected === true}
            conventions={attempt.conventions}
            patch={attempt.patch}
          />
        </SubmitPanel>
      ) : null}
      {inReview && followUp && !flow ? (
        <FollowUpApproval
          attemptId={attempt.attemptId}
          prNumber={prNumber}
          hasCommits={!!attempt.patch?.trim()}
          again={!!attempt.submit?.lastError}
        />
      ) : null}
      {inReview && ownAgent ? <SendBackForm attemptId={attempt.attemptId} left={attempt.sendBacksLeft ?? 0} /> : null}
      <SessionTabs
        key={attempt.attemptId}
        tabs={tabs}
        defaultValue={opening}
        label={followUp ? 'This follow-up round' : 'The first attempt'}
      />
    </div>
  );
}

/**
 * A contribution, one page for all its sessions: the issue and its pull request on top, what waits for the user under
 * them, the sessions (the first attempt, each follow-up round, the next round while one may start) beside the one
 * shown. `attempt` is the session in the address (`undefined` while the API does not answer it); `first`, a round's
 * first attempt, read beside it (a first attempt is its own); `next` shows the round not started.
 */
export function ReviewScreen({
  view,
  attempt,
  first: firstRead,
  next = false,
  now,
  resolveHumans,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail | undefined;
  first?: ContributeAttemptDetail;
  next?: boolean;
  now?: Date;
  /** Whether a follow-up's replies resolve people's threads too; `undefined` while the API does not answer it. */
  resolveHumans?: boolean;
}) {
  if (!attempt) {
    return (
      <div className="flex flex-col items-start gap-3" data-review="unavailable">
        <BackLink />
        <h1 className={HEADING.page}>Reviews are not available yet</h1>
        <p className="text-muted-foreground">This is coming soon. Check back shortly.</p>
      </div>
    );
  }

  const followUp = attempt.kind === 'FOLLOW_UP';
  const first = followUp ? firstRead : attempt;
  const showNext = !!first && next && nextRoundOpen(first);
  const issueUrl = githubUrlOf(attempt.url);
  const repo = repoOf(attempt);
  const cards = first
    ? sessionsOf(first, { attemptId: attempt.attemptId, next: showNext }, followUp ? attempt : undefined)
    : null;

  return (
    <div
      className="flex flex-col gap-5"
      data-review={attempt.attemptId}
      data-state={attempt.state}
      data-session={showNext ? NEXT_SESSION : attempt.attemptId}
    >
      <header className="flex flex-col gap-2">
        <BackLink />
        <span className="flex flex-wrap items-center gap-2.5 font-mono text-sm text-muted-foreground">
          {issueUrl ? (
            <a href={issueUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {repo} · issue #{attempt.number} ↗
            </a>
          ) : (
            `${repo} · issue #${attempt.number}`
          )}
          {isOwnAgent(attempt) ? <Pill tone="violet">Your own agent</Pill> : null}
        </span>
        <h1 className={HEADING.page}>{attemptTitleOf(attempt)}</h1>
        {first?.pullRequest ? (
          <PullRequestStatus pullRequest={first.pullRequest} now={now} />
        ) : followUp ? (
          <p data-follow-up-of={attempt.followUpOf?.number ?? ''} className="text-sm text-muted-foreground">
            {attempt.followUpOf === undefined ? (
              'The pull request it follows up is not available yet.'
            ) : (
              <>
                A follow-up of <FollowUpOfLink followUpOf={attempt.followUpOf} />
                {attempt.followUpOf ? (
                  <>
                    {' '}
                    ·{' '}
                    <Link href={attemptPath(attempt.followUpOf.attemptId)} prefetch={false} className="text-link">
                      the change that opened it
                    </Link>
                  </>
                ) : null}
              </>
            )}
          </p>
        ) : null}
      </header>

      {first ? <NeedsYouStrip first={first} next={showNext} now={now} /> : null}

      <div className={cn('grid items-start gap-5', cards && 'lg:grid-cols-[17rem_minmax(0,1fr)]')}>
        {cards ? (
          <SessionsList
            cards={cards}
            rounds={first?.followUps ? `${first.followUps.used} of ${first.followUps.max} rounds used` : null}
          />
        ) : null}
        <div className="flex min-w-0 flex-col gap-4">
          {showNext && first ? (
            <NextRound first={first} view={view} now={now} />
          ) : (
            <SessionDetails attempt={attempt} view={view} now={now} resolveHumans={resolveHumans} />
          )}
        </div>
      </div>
    </div>
  );
}
