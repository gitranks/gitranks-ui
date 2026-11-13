import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  AgentDidPanel,
  ApprovalPanel,
  ChecksPanel,
  CostPanel,
  ReadinessPanel,
  TimelinePanel,
  YourNotePanel,
} from './attempt-panels';
import { SessionsList } from './attempt-sessions';
import { AttemptStatus, FollowUpOfLink, justOpened, PullRequestStatus } from './attempt-status';
import { ContributeNotices } from './contribute-notices';
import { DiffViewer } from './diff-viewer';
import { FollowUpApproval } from './follow-up-approval';
import { FollowUpResult } from './follow-up-result';
import { NextStepCards, YourMoveLine } from './next-step';
import { PrForm, type PrFormProps } from './pr-form';
import { PrNotesPanel } from './pr-notes';
import { PrStoppedProvider } from './pr-stopped';
import { HEADING, Pill } from './primitives';
import { ReplyDrafts } from './reply-drafts';
import { AttemptRepoRules } from './repo-rules';
import { SendBackForm } from './send-back-form';
import { type SessionTab, SessionTabs } from './session-tabs';
import { SubmitPanel } from './submit-panel';
import { attemptTitleOf, editableBodyOf, githubUrlOf, isOwnAgent, repoOf } from '@/lib/contribute/attempt-format';
import { loadAttempt, loadContribute, loadPrNotes, loadResolveHumanThreads } from '@/lib/contribute/contribute.data';
import type { ContributeAttemptDetail, ContributePrNotes, ContributeView } from '@/lib/contribute/contribute.types';
import { accessNoticesOf, isContributePageOpen, settingsOf } from '@/lib/contribute/contribute-state';
import { isWorking } from '@/lib/contribute/decisions';
import { hasOutcomes } from '@/lib/contribute/follow-up-flow';
import { GRANT_BOUNCES } from '@/lib/contribute/grant-resume';
import { nextStepOf, nextStepWaits } from '@/lib/contribute/next-step';
import { orgAccessOf } from '@/lib/contribute/org-access';
import { parsePatch } from '@/lib/contribute/patch';
import { withoutDraftMarks } from '@/lib/contribute/pr-conventions';
import { agentConnectedOf } from '@/lib/contribute/proof';
import { isFinishedAttempt } from '@/lib/contribute/repo-rules';
import {
  attemptPath,
  NEXT_SESSION,
  nextRoundOpen,
  proofTileStageOf,
  runsLabelOf,
  sessionPath,
  sessionsOf,
  waitingThreadsOf,
} from '@/lib/contribute/sessions';
import { cn } from '@/lib/utils';

/** The gates every page of a contribution passes: signed in, let in, and the attempt theirs. */
async function gate(id: string) {
  const [view, attempt] = await Promise.all([loadContribute(), loadAttempt(id)]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'attempt')) redirect('/contribute');
  if (attempt === null) notFound();
  return { view, attempt };
}

/**
 * The contribution's layout, read from its first attempt: the issue and its pull request on top, what waits for the
 * user, and its sessions beside the one shown (`children`). Moving between the sessions keeps it and reads only the
 * session. Any other attempt in the address (a run's own address, or a review the API does not answer) leaves the
 * page to itself.
 */
export async function ContributionLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  const { view, attempt } = await gate(id);
  if (!attempt || attempt.kind === 'FOLLOW_UP') return children;
  // The run under way, read beside it: what the line says of it, and its card before the history lists it.
  const current = attempt.followUps?.currentAttemptId;
  // The maintainers' say on the PR, read beside the run: an API without it leaves the page as it was.
  const [read, prNotes] = await Promise.all([
    current ? loadAttempt(current).catch(() => undefined) : undefined,
    attempt.pullRequest ? loadPrNotes(attempt.attemptId) : undefined,
  ]);
  const run = read?.kind === 'FOLLOW_UP' && read.followUpOf?.attemptId === attempt.attemptId ? read : undefined;
  return (
    <ContributionShell view={view} attempt={attempt} first={attempt} run={run} prNotes={prNotes}>
      {children}
    </ContributionShell>
  );
}

/**
 * The first attempt's page, or the next step (`?session=next`). A run's own address goes under its first attempt, so it
 * shows in the contribution's layout; one whose first attempt is not known shows on its own.
 */
export async function FirstSessionView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [{ view, attempt }, resolveHumans] = await Promise.all([gate(id), loadResolveHumanThreads()]);
  if (!attempt) return <ReviewScreen view={view} attempt={undefined} />;
  if (attempt.kind === 'FOLLOW_UP') {
    const first = await firstOf(attempt);
    if (first) redirect(withQuery(sessionPath(first.attemptId, attempt.attemptId), query));
    const prNotes = await loadPrNotes(attempt.attemptId);
    return <ReviewScreen view={view} attempt={attempt} resolveHumans={resolveHumans} prNotes={prNotes} />;
  }
  const next = query.session === NEXT_SESSION;
  // The next step gone since the layout was read (a run started, say): the address says the first attempt, so the
  // layout marks it too.
  if (next && !nextStepShown(attempt, view)) redirect(attemptPath(attempt.attemptId));
  return <SessionPane view={view} attempt={attempt} first={attempt} next={next} resolveHumans={resolveHumans} />;
}

/** A follow-up run's page, under its first attempt; an address that pairs it with another goes to its own. */
export async function RunSessionView({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const [{ view, attempt }, resolveHumans] = await Promise.all([gate(runId), loadResolveHumanThreads()]);
  if (!attempt) return <ReviewScreen view={view} attempt={undefined} />;
  if (attempt.kind !== 'FOLLOW_UP' || attempt.followUpOf?.attemptId !== id) redirect(attemptPath(runId));
  return <SessionPane view={view} attempt={attempt} resolveHumans={resolveHumans} />;
}

/** A run's first attempt, the one whose pull request it follows up; undefined when that read is no part of its page. */
async function firstOf(run: ContributeAttemptDetail): Promise<ContributeAttemptDetail | undefined> {
  const of = run.followUpOf;
  const read = of ? await loadAttempt(of.attemptId).catch(() => undefined) : undefined;
  return read?.kind === 'FIRST' && (!read.pullRequest || read.pullRequest.prId === of?.prId) ? read : undefined;
}

/** The address with the query it came with (a grant's resume, say). */
function withQuery(path: Route, query: Record<string, string | string[] | undefined>): Route {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, one);
  }
  const search = params.toString();
  return (search ? `${path}?${search}` : path) as Route;
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

/**
 * What the pull request's form is drawn with for a first attempt in review: the title (the approved one, the agent's,
 * else the issue's, each without its WIP or draft marks), the body without the footer, the user's DCO setting, the
 * repo's asks, and whether the submit asks for GitHub access first.
 */
export const prFormPropsOf = (view: ContributeView, attempt: ContributeAttemptDetail): PrFormProps => ({
  attemptId: attempt.attemptId,
  issueNumber: attempt.number,
  repo: repoOf(attempt),
  defaultTitle:
    // Each candidate without its WIP or draft marks: one that is nothing but a mark gives way.
    [attempt.approval?.title, attempt.result?.prTitle, attempt.title]
      .map((title) => withoutDraftMarks(title ?? ''))
      .find(Boolean) ?? `Fix #${attempt.number}`,
  defaultBody: editableBodyOf(attempt.approval?.body ?? attempt.result?.prBody),
  login: view.contributor?.login ?? 'you',
  footer: attempt.prFooter,
  coAuthored: attempt.prCoAuthored,
  dcoMode: view.contributor?.settings?.dco ?? null,
  dcoRequired: attempt.dcoRequired,
  again: !!attempt.submit?.lastError,
  grantNeeded: grantNeededOf(view, attempt),
  grantConnected: view.grant?.connected === true,
  conventions: attempt.conventions,
  patch: attempt.patch,
});

const BackLink = () => (
  <Link href="/contribute/me" prefetch={false} className="text-sm font-semibold text-link">
    ← My contributions
  </Link>
);

/**
 * The next step is shown: a run may start, comments wait (listed with why no run can start), or something only the user
 * can do waits while no run is under way.
 */
const nextStepShown = (first: ContributeAttemptDetail, view: ContributeView, now?: Date): boolean =>
  nextRoundOpen(first) ||
  // The proof's tile leads here: its card is shown whatever its stage.
  !!proofTileStageOf(first, agentConnectedOf(view), now ?? new Date()) ||
  waitingThreadsOf(first).length > 0 ||
  (first.pullRequest?.state === 'OPEN' &&
    !first.followUps?.currentAttemptId &&
    nextStepWaits(nextStepOf(first, agentConnectedOf(view), now)));

/** The pull request's states its first attempt settles in: the header says them, so its session adds no box. */
const PR_SETTLED = new Set(['PR_OPEN', 'FOLLOW_UP', 'MERGED', 'CLOSED']);

/** What the details' Changes tab says when the session has no change to show. */
function emptyDiffOf(attempt: ContributeAttemptDetail): string | undefined {
  if (attempt.patch || isWorking(attempt)) return undefined;
  if (attempt.kind === 'FOLLOW_UP') return 'This run made no commits.';
  if (attempt.state === 'STOPPED' || attempt.state === 'DISCARDED') return 'The agent changed no files.';
  return undefined;
}

/**
 * One session: what the agent did, then what the user acts on (the pull request's form, or a run's comments), then its
 * details a tab each: its changes, its checks, and what it cost and when.
 */
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
  const inReview = attempt.state === 'REVIEW';
  const followUp = attempt.kind === 'FOLLOW_UP';
  const ownAgent = isOwnAgent(attempt);
  const prNumber = followUp ? (attempt.followUpOf?.number ?? null) : (attempt.pullRequest?.number ?? null);
  // The follow-up flow: one card per thread with its outcome, and one approval (an older API: the drafts). An API with
  // the flow answers `checkStatus` (null before the checks), so a run with no reply is one too.
  const flow = followUp && (attempt.checkStatus !== undefined || hasOutcomes(attempt.replyDrafts));
  const files = parsePatch(attempt.patch).files.length;
  const checks = attempt.checksPassed === true ? '✓' : attempt.checksPassed === false ? '✗' : undefined;

  // A run's comments, as the run left them; a first attempt's own drafts, from an API before the flow.
  const comments: ReactNode = followUp ? (
    flow ? (
      <FollowUpResult
        // A push that came back to the review starts the card afresh (its buttons on again).
        key={`${attempt.state}|${attempt.submit?.lastError?.at ?? ''}`}
        attempt={attempt}
        prNumber={prNumber}
        resolveHumans={resolveHumans}
        orgAccess={orgAccessOf()}
      />
    ) : (
      <ReplyDrafts
        drafts={attempt.replyDrafts}
        prNumber={prNumber}
        followUps={new Map([[attempt.attemptId, attempt]])}
        freshness={[attempt.state, attempt.updatedAt].join('|')}
        now={now}
      />
    )
  ) : attempt.pullRequest && attempt.replyDrafts?.length ? (
    <ReplyDrafts
      drafts={attempt.replyDrafts}
      prNumber={prNumber}
      freshness={[attempt.state, attempt.updatedAt, attempt.followUps?.currentAttemptId ?? ''].join('|')}
      now={now}
    />
  ) : null;

  const tabs: SessionTab[] = [
    {
      value: 'changes',
      label: 'Changes',
      badge: files ? `${files} ${files === 1 ? 'file' : 'files'}` : undefined,
      content: (
        <DiffViewer patch={attempt.patch} title={followUp ? 'The new commits' : 'Diff'} empty={emptyDiffOf(attempt)} />
      ),
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
          <CostPanel attempt={attempt} />
          <TimelinePanel attempt={attempt} />
          <YourNotePanel attempt={attempt} />
        </>
      ),
    },
  ];
  // The change itself when there is one; else our checks when they ran; else what it spent and when.
  const opening = attempt.patch?.trim() ? 'changes' : attempt.checks.length ? 'checks' : 'activity';
  const showStatus = followUp || !PR_SETTLED.has(attempt.state) || justOpened(attempt.pullRequest, now);

  return (
    <div className="flex min-w-0 flex-col gap-4" data-session-details={attempt.attemptId}>
      {showStatus ? <AttemptStatus attempt={attempt} now={now} /> : null}
      <AgentDidPanel attempt={attempt} now={now} />
      {/* In review the form holds the approved title and description already. */}
      {!followUp && attempt.approval && !inReview ? <ApprovalPanel attempt={attempt} /> : null}
      {inReview && !followUp ? (
        <SubmitPanel open={!!attempt.submit?.lastError}>
          <PrForm {...prFormPropsOf(view, attempt)} />
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
      {comments}
      <SessionTabs
        key={attempt.attemptId}
        tabs={tabs}
        defaultValue={opening}
        label={followUp ? 'This follow-up run' : 'The first attempt'}
      />
    </div>
  );
}

/**
 * A contribution, one layout for all its sessions: the issue and its pull request on top, what waits for the user under
 * them, the sessions (the first attempt, each follow-up run, the next run while one may start) beside the one shown
 * (`children`). `attempt` names the issue; `first` is the contribution's first attempt, and `run` the run read beside it
 * (the one shown, or the one under way). The address says which session is shown, unless `shown` does.
 */
export function ContributionShell({
  view,
  attempt,
  first,
  run,
  shown,
  now,
  prNotes,
  children,
}: {
  /** Whose contribution: whether their own agent has called (a proof's tile and its card read it). */
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  first?: ContributeAttemptDetail;
  run?: ContributeAttemptDetail;
  shown?: string;
  now?: Date;
  /** The maintainers' say on its PR: a stop, and "this PR helped" notes. */
  prNotes?: ContributePrNotes;
  children: ReactNode;
}) {
  const followUp = attempt.kind === 'FOLLOW_UP';
  const issueUrl = githubUrlOf(attempt.url);
  const repo = repoOf(attempt);
  const cards = first ? sessionsOf(first, run, { agentConnected: agentConnectedOf(view), now }) : null;
  const session = first ? { firstId: first.attemptId, nextShown: nextStepShown(first, view, now), shown } : null;

  return (
    <div className="flex flex-col gap-5" data-contribution={first?.attemptId ?? attempt.attemptId}>
      {/* The access level holds every attempt and run; the key's trouble is Needs you's to say. */}
      <ContributeNotices notices={accessNoticesOf(view)} />
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
        {attempt.newcomersLabel ? (
          <p data-first-timers className="text-sm text-muted-foreground">
            Labelled {attempt.newcomersLabel}: the maintainers keep it for people new to the project.
          </p>
        ) : null}
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

      {prNotes ? <PrNotesPanel notes={prNotes} repo={repo} /> : null}

      <PrStoppedProvider stopped={!!prNotes?.stopped}>
        {first && session ? <YourMoveLine first={first} runs={run ? [run] : []} {...session} now={now} /> : null}

        <div className={cn('grid items-start gap-5', cards && 'lg:grid-cols-[17rem_minmax(0,1fr)]')}>
          {cards && first && session ? (
            <div className="flex min-w-0 flex-col gap-4">
              <SessionsList cards={cards} rounds={runsLabelOf(first)} {...session} />
              <AttemptRepoRules
                rules={first.repoRules}
                settings={settingsOf(view)}
                finished={isFinishedAttempt(first.state)}
              />
            </div>
          ) : null}
          {children}
        </div>
      </PrStoppedProvider>
    </div>
  );
}

/**
 * One session of a contribution, beside its sessions: what it did and what waits in it, or the next step (`next`, with
 * the contribution's `first` attempt).
 */
export function SessionPane({
  view,
  attempt,
  first,
  next = false,
  now,
  resolveHumans,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  first?: ContributeAttemptDetail;
  next?: boolean;
  now?: Date;
  /** Whether a follow-up's replies resolve people's threads too; `undefined` while the API does not answer it. */
  resolveHumans?: boolean;
}) {
  const showNext = next && !!first;
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      data-review={attempt.attemptId}
      data-state={attempt.state}
      data-shown-session={showNext ? NEXT_SESSION : attempt.attemptId}
    >
      {showNext && first ? (
        <NextStepCards first={first} view={view} now={now} />
      ) : (
        <SessionDetails attempt={attempt} view={view} now={now} resolveHumans={resolveHumans} />
      )}
    </div>
  );
}

/**
 * A contribution's page in one: its layout around the session in `attempt` (`undefined` while the API does not answer
 * it). `first` is a run's first attempt, read beside it (a first attempt is its own); `next` shows the run not started.
 * A run whose first attempt is not known shows on its own, with the pull request it follows up.
 */
export function ReviewScreen({
  view,
  attempt,
  first: firstRead,
  next = false,
  now,
  resolveHumans,
  prNotes,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail | undefined;
  first?: ContributeAttemptDetail;
  next?: boolean;
  now?: Date;
  /** Whether a follow-up's replies resolve people's threads too; `undefined` while the API does not answer it. */
  resolveHumans?: boolean;
  /** The maintainers' say on its PR. */
  prNotes?: ContributePrNotes;
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
  // The next step: the next run, what only the user can do, or while no run can start, the comments that wait.
  const showNext = !!first && next && nextStepShown(first, view, now);

  return (
    <ContributionShell
      view={view}
      attempt={attempt}
      first={first}
      run={followUp ? attempt : undefined}
      shown={showNext ? NEXT_SESSION : attempt.attemptId}
      now={now}
      prNotes={prNotes}
    >
      <SessionPane
        view={view}
        attempt={attempt}
        first={first}
        next={showNext}
        now={now}
        resolveHumans={resolveHumans}
      />
    </ContributionShell>
  );
}
