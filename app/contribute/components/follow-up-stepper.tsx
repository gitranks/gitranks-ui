import { HEADING } from './primitives';
import { StepDot } from './submit-stepper';
import type { ContributeAttemptDetail } from '@/lib/contribute/contribute.types';
import { FOLLOW_UP_STEP_LABELS, FOLLOW_UP_STEPS, followUpStepOf } from '@/lib/contribute/follow-up-flow';
import { relativeLabel, usd } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

/** What each step means while it runs, under the stepper. */
const STEP_NOW: Record<(typeof FOLLOW_UP_STEPS)[number], string> = {
  reading: 'The agent is reading the review comments and setting the project up, so it can run the tests.',
  fixing: 'The agent is changing the code for the comments you chose, and drafting a reply to each.',
  checks: 'The agent is done. We are checking its commits before they come to you.',
  ready: 'Read what it did about each comment and the new commits, then push them with the replies, or discard them.',
};

/** In review, the Checks step as our checks came out: a cross where they block, a dash where the tests could not run. */
const CHECK_STEP = { PASSED: 'done', FAILED: 'failed', NOT_RUN: 'skipped', BLOCKED: 'failed' } as const;

/**
 * A follow-up's run as four steps: reading the comments, fixing, our checks, ready for you. The dots are the submit
 * stepper's own (`StepDot`). Nothing is pushed or posted on GitHub before the user approves it. Null outside the run.
 */
export function FollowUpStepper({
  attempt,
  now,
}: {
  attempt: Pick<ContributeAttemptDetail, 'state' | 'events' | 'createdAt' | 'costUsd' | 'budgetUsd' | 'checkStatus'>;
  now?: Date;
}) {
  const step = followUpStepOf(attempt);
  if (!step) return null;
  const at = FOLLOW_UP_STEPS.indexOf(step);
  const ready = step === 'ready';

  return (
    <div data-follow-up-step={step} className="flex flex-col gap-3">
      <h2 className={HEADING.card}>{ready ? 'Ready for you' : 'The agent is on your review comments'}</h2>
      <ol aria-label="Follow-up steps" className="grid grid-cols-4 pt-1">
        {FOLLOW_UP_STEPS.map((each, index) => {
          const checks =
            ready && each === 'checks' && attempt.checkStatus ? CHECK_STEP[attempt.checkStatus.status] : null;
          const state =
            checks ?? (index < at || (ready && index === at) ? 'done' : index === at ? 'current' : 'pending');
          const last = index === FOLLOW_UP_STEPS.length - 1;
          return (
            <li
              key={each}
              data-step={each}
              data-step-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className="relative flex min-w-0 flex-col items-center gap-1.5 px-0.5 text-center"
            >
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="absolute top-4 right-[calc(-50%+1.25rem)] left-[calc(50%+1.25rem)] h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-border"
                >
                  <span
                    className={cn('block h-full origin-left bg-positive', index < at ? 'scale-x-100' : 'scale-x-0')}
                  />
                </span>
              )}
              <StepDot view={{ state }} index={index} changed={false} />
              <span
                className={cn('text-sm leading-tight', state === 'pending' ? 'text-muted-foreground' : 'font-medium')}
              >
                {FOLLOW_UP_STEP_LABELS[each]}
                <span className="sr-only">
                  :{' '}
                  {state === 'done'
                    ? 'done'
                    : state === 'current'
                      ? 'now'
                      : state === 'failed'
                        ? 'did not pass'
                        : state === 'skipped'
                          ? 'could not run'
                          : 'next'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted-foreground">
        {STEP_NOW[step]}
        {ready ? null : (
          <>
            {' '}
            Started {relativeLabel(attempt.createdAt, now)}; {usd(attempt.costUsd)} of the {usd(attempt.budgetUsd)}{' '}
            limit spent so far. Nothing goes to GitHub before you approve it, unless your autopilot is on.
          </>
        )}
      </p>
    </div>
  );
}
