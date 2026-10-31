import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  ApprovalPanel,
  ChecksPanel,
  CostPanel,
  OwnAgentPanel,
  ReadinessPanel,
  ResultPanel,
  TimelinePanel,
} from './attempt-panels';
import { AttemptStatus, FollowUpOfLink } from './attempt-status';
import { DiffViewer } from './diff-viewer';
import { FollowUpApproval } from './follow-up-approval';
import { FollowUpResult } from './follow-up-result';
import { FollowUpRounds, PrSignals } from './pr-follow-ups';
import { PrForm } from './pr-form';
import { HEADING, Pill } from './primitives';
import { ReplyDrafts } from './reply-drafts';
import { ReviewFeedbackCard } from './review-feedback';
import { attemptHref } from './reviews-ready';
import { SendBackForm } from './send-back-form';
import {
  ATTEMPT_STATES,
  attemptTitleOf,
  editableBodyOf,
  githubUrlOf,
  isOwnAgent,
  repoOf,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import { loadAttempt, loadContribute, loadResolveHumanThreads } from '@/lib/contribute/contribute.data';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import { isContributePageOpen } from '@/lib/contribute/contribute-state';
import { hasOutcomes } from '@/lib/contribute/follow-up-flow';
import { canStartFollowUp } from '@/lib/contribute/follow-up-format';
import { GRANT_BOUNCES } from '@/lib/contribute/grant-resume';

export async function ReviewView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [view, attempt, resolveHumans] = await Promise.all([
    loadContribute(),
    loadAttempt(id),
    loadResolveHumanThreads(),
  ]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'attempt')) redirect('/contribute');
  if (attempt === null) notFound();
  return <ReviewScreen view={view} attempt={attempt} resolveHumans={resolveHumans} />;
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
  <Link href="/contribute/me" prefetch={false} className="text-sm">
    ← My contributions
  </Link>
);

/**
 * Review an attempt: where it stands, what the agent changed and why, our checks, the diff, the cost and the timeline;
 * in review, the pull request to submit. `attempt` is `undefined` while the API does not answer the review yet.
 */
export function ReviewScreen({
  view,
  attempt,
  now,
  resolveHumans,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail | undefined;
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

  const state = toneLabelOf(ATTEMPT_STATES, attempt.state);
  const issueUrl = githubUrlOf(attempt.url);
  const login = view.contributor?.login ?? 'you';
  const repo = repoOf(attempt);
  const inReview = attempt.state === 'REVIEW';
  const followUp = attempt.kind === 'FOLLOW_UP';
  const ownAgent = isOwnAgent(attempt);
  const prNumber = followUp ? (attempt.followUpOf?.number ?? null) : (attempt.pullRequest?.number ?? null);
  // A first attempt shows its pull request's drafts once there is one; a follow-up always shows the ones it wrote.
  const showDrafts = followUp || (!!attempt.pullRequest && attempt.replyDrafts?.length !== 0);
  // The follow-up flow: one card per thread with its outcome, the diff, and one approval (an older API: the drafts).
  // An API with the flow answers `checkStatus` (null before the checks), so a round with no reply is one too.
  const flow = followUp && (attempt.checkStatus !== undefined || hasOutcomes(attempt.replyDrafts));
  const feedback = !followUp && attempt.pullRequest?.state === 'OPEN' ? attempt.reviewFeedback : null;
  const roundOpen = !!attempt.followUps && canStartFollowUp(attempt.followUps) && attempt.state === 'PR_OPEN';

  return (
    <div className="flex flex-col gap-5" data-review={attempt.attemptId} data-state={attempt.state}>
      <div className="flex flex-col gap-2.5">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill tone={state.tone}>{state.label}</Pill>
          {attempt.kind === 'FOLLOW_UP' ? <Pill>Follow-up</Pill> : null}
          {ownAgent ? <Pill tone="violet">Your own agent</Pill> : null}
          <span className="font-mono text-sm text-muted-foreground">
            {issueUrl ? (
              <a href={issueUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {repo} · issue #{attempt.number}
              </a>
            ) : (
              `${repo} · issue #${attempt.number}`
            )}
          </span>
        </div>
        <h1 className={HEADING.page}>{attemptTitleOf(attempt)}</h1>
        {followUp ? (
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
                    <Link href={attemptHref(attempt.followUpOf.attemptId)} prefetch={false} className="text-link">
                      the change that opened it
                    </Link>
                  </>
                ) : null}
              </>
            )}
          </p>
        ) : null}
      </div>

      <AttemptStatus attempt={attempt} now={now} />

      {!followUp &&
      attempt.pullRequest &&
      (attempt.pullRequest.state === 'OPEN' || (attempt.followUps?.used ?? 0) > 0) ? (
        <section data-panel="follow-ups" className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
          <h2 className={HEADING.card}>
            {attempt.needsYou?.signals.length ? 'Your pull request needs you' : 'Follow-ups'}
          </h2>
          <PrSignals
            needsYou={attempt.needsYou}
            now={now}
            prId={attempt.pullRequest.state === 'OPEN' ? attempt.pullRequest.prId : undefined}
          />
          <FollowUpRounds
            followUps={attempt.followUps}
            pullRequest={attempt.pullRequest}
            attemptCapUsd={view.contributor?.settings?.attemptCapUsd}
            // The review-feedback card below starts the round on the threads chosen.
            startHere={!feedback?.threads.length}
          />
        </section>
      ) : null}

      {feedback?.threads.length && attempt.pullRequest ? (
        <ReviewFeedbackCard
          // A thread arriving in a later read starts the choices afresh: none is shown chosen but left out.
          key={feedback.threads.map((thread) => thread.commentId).join(',')}
          prId={attempt.pullRequest.prId}
          prNumber={attempt.pullRequest.number}
          feedback={feedback}
          canStart={roundOpen}
          blocked={
            roundOpen
              ? null
              : attempt.followUps?.currentAttemptId
                ? 'A follow-up is under way on these comments.'
                : 'Every follow-up round is used: answer these on GitHub.'
          }
          attemptCapUsd={view.contributor?.settings?.attemptCapUsd}
          now={now}
        />
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          <ResultPanel attempt={attempt} />
          {flow ? (
            <FollowUpResult
              // A push that came back to the review starts the card afresh (its buttons on again).
              key={`${attempt.state}|${attempt.submit?.lastError?.at ?? ''}`}
              attempt={attempt}
              prNumber={prNumber}
              resolveHumans={resolveHumans}
            >
              {attempt.patch?.trim() ? <DiffViewer patch={attempt.patch} title="The new commits" /> : null}
            </FollowUpResult>
          ) : null}
          <ChecksPanel attempt={attempt} />
          {flow ? null : <DiffViewer patch={attempt.patch} title={followUp ? 'The new commits' : 'Diff'} />}
          {showDrafts && !flow ? (
            <ReplyDrafts
              drafts={attempt.replyDrafts}
              prNumber={prNumber}
              followUps={followUp ? new Map([[attempt.attemptId, attempt]]) : undefined}
              freshness={[attempt.state, attempt.updatedAt, attempt.followUps?.currentAttemptId ?? ''].join('|')}
              now={now}
            />
          ) : null}
        </div>
        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
          {ownAgent ? <OwnAgentPanel attempt={attempt} now={now} /> : <CostPanel attempt={attempt} />}
          {inReview && followUp && flow ? null : inReview && followUp ? (
            <FollowUpApproval
              attemptId={attempt.attemptId}
              prNumber={prNumber}
              hasCommits={!!attempt.patch?.trim()}
              again={!!attempt.submit?.lastError}
            />
          ) : inReview ? (
            <PrForm
              attemptId={attempt.attemptId}
              issueNumber={attempt.number}
              repo={repo}
              defaultTitle={
                attempt.approval?.title ||
                attempt.result?.prTitle?.trim() ||
                attempt.title?.trim() ||
                `Fix #${attempt.number}`
              }
              defaultBody={editableBodyOf(attempt.approval?.body ?? attempt.result?.prBody)}
              login={login}
              dcoMode={view.contributor?.settings?.dco ?? null}
              dcoRequired={attempt.dcoRequired}
              again={!!attempt.submit?.lastError}
              grantNeeded={grantNeededOf(view, attempt)}
              grantConnected={view.grant?.connected === true}
            />
          ) : followUp ? null : (
            <ApprovalPanel attempt={attempt} />
          )}
          {inReview && ownAgent ? (
            <SendBackForm attemptId={attempt.attemptId} left={attempt.sendBacksLeft ?? 0} />
          ) : null}
          <TimelinePanel attempt={attempt} />
          <ReadinessPanel attempt={attempt} />
        </aside>
      </div>
    </div>
  );
}
