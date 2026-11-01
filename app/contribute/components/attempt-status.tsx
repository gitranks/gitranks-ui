import Link from 'next/link';
import type { ReactNode } from 'react';

import { AutosubmitCountdown, RetryCheckButton, StopAutopilotButton } from './follow-up-buttons';
import { FollowUpStepper } from './follow-up-stepper';
import { HEADING, Pill } from './primitives';
import { attemptHref } from './reviews-ready';
import { LiveSubmit, SubmitStepsSettled, TryAgainButton } from './submit-stepper';
import {
  ATTEMPT_STATES,
  checkLimitOf,
  detailText,
  END_REASONS,
  endReasonTextOf,
  githubUrlOf,
  labelOf,
  limitNoteOf,
  noGoReasonOf,
  PR_CHECKS,
  PR_STATES,
  REVIEW_DECISIONS,
  timeLabel,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptPullRequest,
  ContributeAttemptSubmit,
  ContributeAutopilotReviewReason,
  ContributeFollowUpOf,
} from '@/lib/contribute/contribute.types';
import { roundLineOf } from '@/lib/contribute/follow-up-flow';
import { relativeLabel, usd } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

function Box({
  children,
  tone = 'info',
  state,
}: {
  children: ReactNode;
  tone?: 'info' | 'warn' | 'done' | 'muted';
  state: string;
}) {
  return (
    <section
      data-attempt-status={state}
      // Focused when a submission starts, so keyboard and screen reader users land on its progress.
      tabIndex={-1}
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-5 py-4 outline-none',
        tone === 'info' && 'border-primary/20 bg-brand-soft',
        tone === 'warn' && 'border-warning/30 bg-warning-soft',
        tone === 'done' && 'bg-card',
        tone === 'muted' && 'bg-muted/40',
      )}
    >
      {children}
    </section>
  );
}

const Title = ({ children }: { children: ReactNode }) => <h2 className={HEADING.card}>{children}</h2>;
const Text = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/** Why autopilot left it for the user's review instead of submitting it; nothing for an ordinary review. */
const AUTOPILOT_REVIEW_NOTES: Partial<Record<ContributeAutopilotReviewReason, string>> = {
  no_email: 'Autopilot did not submit it: we have no email to tell you first, so it waits for your review.',
  notice_late: 'Autopilot did not submit it: we could not email you first, so it waits for your review.',
  autopilot_off: 'Autopilot did not submit it: autopilot was turned off or locked before it did.',
};

export function AutopilotReviewNote({ reason }: { reason: ContributeAttempt['reviewReason'] }) {
  const note = reason && Object.hasOwn(AUTOPILOT_REVIEW_NOTES, reason) ? AUTOPILOT_REVIEW_NOTES[reason] : undefined;
  if (!note) return null;
  return (
    <p data-autopilot-review-reason={reason} className="text-sm text-warning">
      {note}
    </p>
  );
}

/** The note the API left after a submission step went wrong: why, and what to do. */
export function SubmitErrorNote({ submit }: { submit: ContributeAttemptSubmit | null }) {
  if (!submit?.lastError) return null;
  return (
    <p role="alert" data-submit-error={submit.lastError.reason} className="text-sm text-warning-soft-foreground">
      {submit.lastError.note || 'The last step did not go through.'}{' '}
      <span className="text-muted-foreground">({timeLabel(submit.lastError.at)})</span>
    </p>
  );
}

/** A pull request opened in the last few minutes: its box still shows the steps that opened it. */
const JUST_OPENED_MS = 10 * 60_000;
export const justOpened = (pullRequest: ContributeAttemptPullRequest | null | undefined, now?: Date) => {
  const opened = pullRequest ? Date.parse(pullRequest.openedAt) : Number.NaN;
  return !Number.isNaN(opened) && (now ?? new Date()).getTime() - opened < JUST_OPENED_MS;
};

/** The submission stopped at one of the four steps (not before the fork: a busy repo, say). */
const failedAtStep = (submit: ContributeAttemptSubmit) => submit.step !== 'QUEUED' && submit.step !== 'WAITING_CAP';

/** The pull request once it is open: a link, its state on GitHub, and when the last sync read it. */
export function PullRequestStatus({ pullRequest, now }: { pullRequest: ContributeAttemptPullRequest; now?: Date }) {
  const state = toneLabelOf(PR_STATES, pullRequest.state);
  const url = githubUrlOf(pullRequest.url);
  const ended =
    pullRequest.state === 'MERGED'
      ? `merged ${relativeLabel(pullRequest.mergedAt, now)}`
      : pullRequest.state === 'CLOSED'
        ? `closed ${relativeLabel(pullRequest.closedAt, now)}`
        : null;

  return (
    <div data-pr-state={pullRequest.state} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Pill tone={state.tone}>{state.label}</Pill>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
            Pull request #{pullRequest.number} on GitHub ↗
          </a>
        ) : (
          <span className="font-semibold">Pull request #{pullRequest.number}</span>
        )}
      </div>
      <Text>
        Opened {relativeLabel(pullRequest.openedAt, now)}
        {ended ? `, ${ended}` : ''}.
        {pullRequest.state === 'OPEN' && pullRequest.reviewDecision
          ? ` ${labelOf(REVIEW_DECISIONS, pullRequest.reviewDecision)}.`
          : ''}
        {pullRequest.checks ? ` ${labelOf(PR_CHECKS, pullRequest.checks)}.` : ''}
        {pullRequest.syncedAt ? ` Read from GitHub ${relativeLabel(pullRequest.syncedAt, now)}.` : ''}
      </Text>
    </div>
  );
}

/** The pull request a follow-up works on: `pull request #1419 ↗`, or words while it is not known. */
export function FollowUpOfLink({ followUpOf }: { followUpOf: ContributeFollowUpOf | null | undefined }) {
  if (!followUpOf) return <>the pull request</>;
  const url = githubUrlOf(followUpOf.url);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
      pull request #{followUpOf.number} ↗
    </a>
  ) : (
    <>pull request #{followUpOf.number}</>
  );
}

/** Autopilot's hour: when it submits, and the user's Stop. Kept even while autopilot is off for everyone. */
function AutosubmitStatus({ attempt, now }: { attempt: ContributeAttempt; now?: Date }) {
  if (attempt.autosubmitAt === undefined) {
    return <Text>When it submits, and stopping it, are not available yet.</Text>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      <Text>
        {attempt.autosubmitAt ? (
          <AutosubmitCountdown at={attempt.autosubmitAt} from={(now ?? new Date()).toISOString()} />
        ) : (
          'Emailing you first. The hour starts once the email is sent.'
        )}{' '}
        Stop it to review the change yourself first.
      </Text>
      <StopAutopilotButton attemptId={attempt.attemptId} />
    </div>
  );
}

/** What a follow-up that ended without pushing came to, in plain words, by why it ended. */
const FOLLOW_UP_ENDS: Partial<Record<NonNullable<ContributeAttempt['endReason']>, string>> = {
  NO_GO: 'The agent read the comments and decided not to change anything.',
  CHECKS_FAILED: 'Our checks stopped it before the review.',
  BUDGET: 'It reached your limit for one attempt before it finished.',
  TIMEOUT: 'It ran past the two-hour limit before it finished.',
  FAILED: 'The agent session failed before it finished.',
  CANCELLED: 'It was cancelled before it finished.',
  SUBMIT_FAILED: 'The push did not go through.',
  USER: 'You discarded it.',
};

/** Back to the pull request's page, where another round can start. */
function BackToPr({ attempt }: { attempt: ContributeAttempt }) {
  if (!attempt.followUpOf) return null;
  return (
    <Link href={attemptHref(attempt.followUpOf.attemptId)} prefetch={false} className="text-sm font-semibold text-link">
      Back to the pull request&apos;s page →
    </Link>
  );
}

/**
 * A follow-up's place in its own words: it adds commits to a pull request rather than opening one. While it runs, its
 * four steps; in review, ready; after, what it came to and what the user can do. Null for a state that reads as a
 * first attempt's.
 */
function followUpStatusOf(attempt: ContributeAttempt | ContributeAttemptDetail, now?: Date): ReactNode {
  const pr = <FollowUpOfLink followUpOf={attempt.followUpOf} />;
  const events = 'events' in attempt ? attempt.events : undefined;
  switch (attempt.state) {
    case 'QUEUED':
    case 'RUNNING':
    case 'CHECKS':
      return (
        <Box state={attempt.state}>
          <FollowUpStepper attempt={{ ...attempt, events: events ?? [] }} now={now} />
        </Box>
      );
    case 'REVIEW':
      return (
        <Box state="REVIEW" tone={attempt.submit?.lastError ? 'warn' : 'info'}>
          {attempt.submit?.lastError ? (
            <>
              <Title>Back for your approval</Title>
              <Text>The push did not go through. Nothing was posted. Read the note, then try again or discard it.</Text>
            </>
          ) : (
            <FollowUpStepper attempt={{ ...attempt, events: events ?? [] }} now={now} />
          )}
          <AutopilotReviewNote reason={attempt.reviewReason} />
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    case 'SUBMITTING':
      return (
        <Box state="SUBMITTING">
          <Title>Pushing the fixes</Title>
          <Text>
            Approved. The commits are going onto {pr}&apos;s branch on your fork; the replies you chose are posted once
            they are there.
          </Text>
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    case 'DONE': {
      const round = 'round' in attempt ? attempt.round : undefined;
      return (
        <Box state="DONE" tone="done">
          <Title>Pushed to the pull request</Title>
          {round ? (
            <p data-round-line={round.round} className="text-sm font-semibold">
              {roundLineOf(round)}
            </p>
          ) : null}
          <Text>
            The new commits are on {pr}, if there were any. {usd(attempt.costUsd)} was spent. Each reply&apos;s state is
            below; one that did not go with the push can still be posted from there.
          </Text>
          <BackToPr attempt={attempt} />
        </Box>
      );
    }
    case 'STOPPED':
    case 'DISCARDED': {
      const why =
        attempt.endReason === 'CHECKS_FAILED' && attempt.endDetail === 'not_empty'
          ? 'The agent wrote no commit and no reply, so there was nothing to review.'
          : (attempt.endReason && FOLLOW_UP_ENDS[attempt.endReason]) ||
            (attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : 'Why it ended is not available yet.');
      return (
        <Box state={attempt.state} tone="muted">
          <Title>{attempt.state === 'STOPPED' ? 'Stopped, nothing pushed' : 'Discarded, nothing pushed'}</Title>
          <Text>
            <span data-end-reason={attempt.endReason ?? ''}>{why}</span>
            {attempt.endDetail && attempt.endDetail !== 'not_empty' ? (
              <>
                {' '}
                {attempt.endReason === 'NO_GO' ? 'Its reason: ' : 'Detail: '}
                {detailText(attempt.endDetail)}
              </>
            ) : null}{' '}
            Nothing was pushed to {pr} and no reply was posted. {usd(attempt.costUsd)} was spent. The comments still
            wait on the pull request: answer them on GitHub, or start another round from its page if one is left.
          </Text>
          <SubmitErrorNote submit={attempt.submit} />
          <BackToPr attempt={attempt} />
        </Box>
      );
    }
    default:
      return null;
  }
}

/** Where the attempt stands, at the top of its page: one block for each state. */
export function AttemptStatus({ attempt, now }: { attempt: ContributeAttempt | ContributeAttemptDetail; now?: Date }) {
  const spent = `${usd(attempt.costUsd)} of the ${usd(attempt.budgetUsd)} limit spent so far.`;

  if (attempt.kind === 'FOLLOW_UP') {
    const followUp = followUpStatusOf(attempt, now);
    if (followUp) return followUp;
  }

  switch (attempt.state) {
    case 'QUEUED':
      return (
        <Box state="QUEUED" tone="muted">
          <Title>Queued</Title>
          <Text>It starts when your limits allow the next attempt.</Text>
        </Box>
      );
    case 'CLAIMING':
      return (
        <Box state="CLAIMING">
          <Title>Starting</Title>
          <Text>Checking that the issue is still open and nobody else is on it, before the agent starts.</Text>
        </Box>
      );
    case 'RUNNING':
      return (
        <Box state="RUNNING">
          <Title>The agent is working on it</Title>
          <Text>
            Started {relativeLabel(attempt.createdAt, now)}. {spent} The review opens here when it is done.
          </Text>
        </Box>
      );
    case 'CHECKS':
      return (
        <Box state="CHECKS">
          <Title>Running our checks</Title>
          <Text>The agent is done. We are checking the change before it comes to you.</Text>
        </Box>
      );
    case 'REVIEW':
      return (
        <Box state="REVIEW" tone={attempt.submit?.lastError ? 'warn' : 'info'}>
          <Title>{attempt.submit?.lastError ? 'Back for your approval' : 'Ready for your review'}</Title>
          {attempt.submit?.lastError && failedAtStep(attempt.submit) ? (
            <SubmitStepsSettled state="REVIEW" submit={attempt.submit} />
          ) : null}
          <Text>Read the change, then submit it as your pull request or discard it. It waits seven days for you.</Text>
          <AutopilotReviewNote reason={attempt.reviewReason} />
          <SubmitErrorNote submit={attempt.submit} />
          {attempt.submit?.lastError ? <TryAgainButton /> : null}
        </Box>
      );
    case 'PENDING_AUTOSUBMIT':
      return (
        <Box state="PENDING_AUTOSUBMIT" tone="warn">
          <Title>Autopilot submits this unless you stop it</Title>
          <Text>
            {attempt.kind === 'FOLLOW_UP'
              ? 'Every check passed and the agent rated its risk low, so autopilot pushes the commits for you.'
              : 'Every check passed and the agent rated its risk low, so autopilot opens the pull request for you.'}
          </Text>
          <AutosubmitStatus attempt={attempt} now={now} />
        </Box>
      );
    case 'SUBMITTING':
      return (
        <Box state="SUBMITTING" tone={attempt.submit?.step === 'WAITING_CAP' ? 'warn' : 'info'}>
          {/* Only what the stepper reads: the rest of the attempt (its diff, say) stays on the server. */}
          <LiveSubmit
            attempt={{
              attemptId: attempt.attemptId,
              state: attempt.state,
              updatedAt: attempt.updatedAt,
              submit: attempt.submit,
              pullRequest: attempt.pullRequest,
            }}
            now={now}
          />
        </Box>
      );
    case 'PR_OPEN':
    case 'FOLLOW_UP':
    case 'MERGED':
    case 'CLOSED': {
      const fresh = justOpened(attempt.pullRequest, now);
      return (
        <Box state={attempt.state} tone="done">
          <Title>
            {attempt.state === 'MERGED'
              ? 'Merged'
              : attempt.state === 'CLOSED'
                ? 'Closed without merging'
                : attempt.state === 'FOLLOW_UP'
                  ? 'A follow-up is running on your pull request'
                  : 'Your pull request is open'}
          </Title>
          {attempt.state === 'PR_OPEN' && attempt.submit && fresh ? (
            <SubmitStepsSettled state={attempt.state} submit={attempt.submit} pullRequest={attempt.pullRequest} />
          ) : null}
          {attempt.pullRequest ? (
            <div
              className={
                fresh
                  ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400'
                  : undefined
              }
            >
              <PullRequestStatus pullRequest={attempt.pullRequest} now={now} />
            </div>
          ) : (
            <Text>The pull request is not available yet.</Text>
          )}
          {attempt.state === 'FOLLOW_UP' && attempt.followUps?.currentAttemptId ? (
            <Link
              href={attemptHref(attempt.followUps.currentAttemptId)}
              prefetch={false}
              className="text-sm font-semibold text-link"
            >
              See the follow-up →
            </Link>
          ) : null}
        </Box>
      );
    }
    case 'STOPPED': {
      const limit = checkLimitOf(attempt);
      const ranOut = !!limit && !limit.decided;
      return (
        <Box state="STOPPED" tone="muted">
          <Title>{ranOut ? 'Stopped while checking the issue' : 'Stopped'}</Title>
          <Text>
            <span data-end-reason={attempt.endReason ?? ''} data-check-limit={limit ? limit.limit : undefined}>
              {endReasonTextOf(attempt) ?? 'Why it stopped is not available yet.'}
            </span>
            {attempt.endDetail ? (
              <>
                {' '}
                {ranOut ? '' : attempt.endReason === 'NO_GO' ? 'Its reason: ' : 'Detail: '}
                {detailText(noGoReasonOf(attempt.endDetail))}
              </>
            ) : null}{' '}
            {usd(attempt.costUsd)} was spent.
            {attempt.endReason === 'SUBMIT_FAILED'
              ? ''
              : ranOut
                ? ' Nothing was decided about the issue; it went back to the pool.'
                : ' The issue went back to the pool.'}
          </Text>
          {limit?.decided ? (
            <span data-limit-note className="text-xs text-muted-foreground">
              {limitNoteOf(limit)}
            </span>
          ) : null}
          {'retryable' in attempt && attempt.retryable ? <RetryCheckButton attemptId={attempt.attemptId} /> : null}
          {attempt.endReason === 'SUBMIT_FAILED' && attempt.submit && failedAtStep(attempt.submit) ? (
            <SubmitStepsSettled state="STOPPED" submit={attempt.submit} />
          ) : null}
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    }
    case 'DISCARDED':
      return (
        <Box state="DISCARDED" tone="muted">
          <Title>Discarded</Title>
          <Text>
            <span data-end-reason={attempt.endReason ?? ''}>
              {attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : 'It was discarded.'}
            </span>{' '}
            The issue went back to the pool, and nothing was submitted.
          </Text>
        </Box>
      );
    default:
      // A state this UI does not know yet: its name, and nothing it cannot back up.
      return (
        <Box state={attempt.state} tone="muted">
          <Title>{toneLabelOf(ATTEMPT_STATES, attempt.state).label}</Title>
          <Text>More about this state is not available yet.</Text>
        </Box>
      );
  }
}
