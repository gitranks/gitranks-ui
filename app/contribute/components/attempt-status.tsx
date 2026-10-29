import Link from 'next/link';
import type { ReactNode } from 'react';

import { AutosubmitCountdown, StopAutopilotButton } from './follow-up-buttons';
import { Pill } from './primitives';
import { attemptHref } from './reviews-ready';
import {
  ATTEMPT_STATES,
  detailText,
  END_REASONS,
  githubUrlOf,
  labelOf,
  PR_CHECKS,
  PR_STATES,
  REVIEW_DECISIONS,
  SUBMIT_STEP_TEXT,
  SUBMIT_STEPS,
  timeLabel,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import type {
  ContributeAttempt,
  ContributeAttemptPullRequest,
  ContributeAttemptSubmit,
  ContributeFollowUpOf,
} from '@/lib/contribute/contribute.types';
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
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-5 py-4',
        tone === 'info' && 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40',
        tone === 'warn' && 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
        tone === 'done' && 'bg-card',
        tone === 'muted' && 'bg-muted/40',
      )}
    >
      {children}
    </section>
  );
}

const Title = ({ children }: { children: ReactNode }) => <h2 className="font-semibold">{children}</h2>;
const Text = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/** The note the API left after a submission step went wrong: why, and what to do. */
export function SubmitErrorNote({ submit }: { submit: ContributeAttemptSubmit | null }) {
  if (!submit?.lastError) return null;
  return (
    <p role="alert" data-submit-error={submit.lastError.reason} className="text-sm text-amber-900 dark:text-amber-200">
      {submit.lastError.note || 'The last step did not go through.'}{' '}
      <span className="text-muted-foreground">({timeLabel(submit.lastError.at)})</span>
    </p>
  );
}

/** Fork, sync, push, pull request: the step the submission is on. */
function SubmitSteps({ submit, now }: { submit: ContributeAttemptSubmit; now?: Date }) {
  const current = SUBMIT_STEPS.findIndex(({ step }) => step === submit.step);

  return (
    <>
      <ol aria-label="Submission steps" className="flex flex-wrap items-center gap-2 text-sm">
        {SUBMIT_STEPS.map(({ step, label }, index) => {
          const state = current < 0 || index > current ? 'pending' : index === current ? 'current' : 'done';
          return (
            <li
              key={step}
              data-step={step}
              data-step-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1',
                state === 'done' && 'border-green-300 text-green-800 dark:border-green-800 dark:text-green-300',
                state === 'current' && 'border-primary bg-background font-semibold text-foreground',
                state === 'pending' && 'text-muted-foreground',
              )}
            >
              <span aria-hidden="true">{state === 'done' ? '✓' : `${index + 1}`}</span>
              {label}
            </li>
          );
        })}
      </ol>
      <Text>
        {labelOf(SUBMIT_STEP_TEXT, submit.step)}
        {submit.step === 'WAITING_CAP'
          ? submit.waitUntil
            ? ` It goes on ${relativeLabel(submit.waitUntil, now)}, at ${timeLabel(submit.waitUntil)}. Nothing to do: it starts by itself.`
            : ' It goes on when the next UTC day starts. Nothing to do: it starts by itself.'
          : ''}
        {submit.fork ? ` From ${submit.fork}${submit.branch ? `, branch ${submit.branch}` : ''}.` : ''}
      </Text>
    </>
  );
}

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
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
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
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
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
          'It submits within the hour.'
        )}{' '}
        Stop it to review the change yourself first.
      </Text>
      <StopAutopilotButton attemptId={attempt.attemptId} />
    </div>
  );
}

/**
 * A follow-up's place in its own words: it adds commits to a pull request rather than opening one. Null for a state
 * that reads as a first attempt's.
 */
function followUpStatusOf(attempt: ContributeAttempt): ReactNode {
  const pr = <FollowUpOfLink followUpOf={attempt.followUpOf} />;
  switch (attempt.state) {
    case 'REVIEW':
      return (
        <Box state="REVIEW" tone={attempt.submit?.lastError ? 'warn' : 'info'}>
          <Title>{attempt.submit?.lastError ? 'Back for your approval' : 'Ready for your review'}</Title>
          <Text>
            Read the new commits and the replies drafted for you, then push the commits to {pr} or discard them.
          </Text>
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    case 'SUBMITTING':
      return (
        <Box state="SUBMITTING">
          <Title>Pushing the commits</Title>
          <Text>Approved. The commits are going onto {pr}&apos;s branch on your fork.</Text>
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    case 'DONE':
      return (
        <Box state="DONE" tone="done">
          <Title>Pushed to the pull request</Title>
          <Text>
            The commits are on {pr}, if there were any. {usd(attempt.costUsd)} was spent. Approve the replies below for
            them to be posted.
          </Text>
        </Box>
      );
    case 'STOPPED':
    case 'DISCARDED':
      return (
        <Box state={attempt.state} tone="muted">
          <Title>{attempt.state === 'STOPPED' ? 'Stopped' : 'Discarded'}</Title>
          <Text>
            <span data-end-reason={attempt.endReason ?? ''}>
              {attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : 'Why it ended is not available yet.'}
            </span>
            {attempt.endDetail ? <> Detail: {detailText(attempt.endDetail)}</> : null} Nothing was pushed to {pr}.{' '}
            {usd(attempt.costUsd)} was spent.
          </Text>
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    default:
      return null;
  }
}

/** Where the attempt stands, at the top of its page: one block for each state. */
export function AttemptStatus({ attempt, now }: { attempt: ContributeAttempt; now?: Date }) {
  const spent = `${usd(attempt.costUsd)} of the ${usd(attempt.budgetUsd)} limit spent so far.`;

  if (attempt.kind === 'FOLLOW_UP') {
    const followUp = followUpStatusOf(attempt);
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
          <Text>Read the change, then submit it as your pull request or discard it. It waits seven days for you.</Text>
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    case 'PENDING_AUTOSUBMIT':
      return (
        <Box state="PENDING_AUTOSUBMIT" tone="warn">
          <Title>Autopilot submits this within the hour</Title>
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
          <Title>
            {attempt.submit?.step === 'WAITING_CAP' ? 'Waiting for tomorrow' : 'Submitting your pull request'}
          </Title>
          {attempt.submit ? (
            <SubmitSteps submit={attempt.submit} now={now} />
          ) : (
            <Text>Approved. The steps are not available yet.</Text>
          )}
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
    case 'PR_OPEN':
    case 'FOLLOW_UP':
    case 'MERGED':
    case 'CLOSED':
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
          {attempt.pullRequest ? (
            <PullRequestStatus pullRequest={attempt.pullRequest} now={now} />
          ) : (
            <Text>The pull request is not available yet.</Text>
          )}
          {attempt.state === 'FOLLOW_UP' && attempt.followUps?.currentAttemptId ? (
            <Link
              href={attemptHref(attempt.followUps.currentAttemptId)}
              prefetch={false}
              className="text-sm font-semibold text-primary"
            >
              See the follow-up →
            </Link>
          ) : null}
        </Box>
      );
    case 'STOPPED':
      return (
        <Box state="STOPPED" tone="muted">
          <Title>Stopped</Title>
          <Text>
            <span data-end-reason={attempt.endReason ?? ''}>
              {attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : 'Why it stopped is not available yet.'}
            </span>
            {attempt.endDetail ? (
              <>
                {' '}
                {attempt.endReason === 'NO_GO' ? 'Its reason: ' : 'Detail: '}
                {detailText(attempt.endDetail)}
              </>
            ) : null}{' '}
            {usd(attempt.costUsd)} was spent.
            {attempt.endReason === 'SUBMIT_FAILED' ? '' : ' The issue went back to the pool.'}
          </Text>
          <SubmitErrorNote submit={attempt.submit} />
        </Box>
      );
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
