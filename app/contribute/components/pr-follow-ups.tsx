import Link from 'next/link';

import { MarkHandledButton, StartFollowUpButton } from './follow-up-buttons';
import { attemptHref } from './reviews-ready';
import type {
  ContributeAttemptPullRequest,
  ContributeFollowUps,
  ContributeNeedsYou,
} from '@/lib/contribute/contribute.types';
import { roundLineOf } from '@/lib/contribute/follow-up-flow';
import { canStartFollowUp, roundsText, signalText } from '@/lib/contribute/follow-up-format';
import { dayLabel, usd } from '@/lib/contribute/format';

/**
 * What happened on the pull request since the user last acted on it, newest first, each with when; with `prId`,
 * "Mark as handled" under them. Each leaves on its own once its cause is gone on GitHub.
 */
export function PrSignals({
  needsYou,
  now,
  prId,
  prNumber,
}: {
  needsYou: ContributeNeedsYou | null | undefined;
  now?: Date;
  prId?: string;
  prNumber?: number;
}) {
  if (needsYou === undefined) {
    return <p className="text-sm text-muted-foreground">What changed on GitHub is not available yet.</p>;
  }
  if (!needsYou?.signals.length) return null;
  const list = (
    <ul data-signals={needsYou.signals.length} className="flex flex-col gap-1 text-sm">
      {[...needsYou.signals].reverse().map((signal, index) => (
        <li key={`${index}-${signal.kind}-${signal.at}`} data-signal={signal.kind} className="flex gap-2">
          <span aria-hidden="true" className="text-warning">
            •
          </span>
          <span>{signalText(signal, now)}</span>
        </li>
      ))}
    </ul>
  );
  if (!prId) return list;
  return (
    <div className="flex flex-col gap-2">
      {list}
      {/* A signal arriving later is a new "needs you": the button starts afresh. */}
      <MarkHandledButton key={needsYou.since} prId={prId} prNumber={prNumber} />
    </div>
  );
}

/**
 * The pull request's follow-up rounds: how many are used and left, and "Start a follow-up" while one may start; past
 * the last round, that the pull request is the user's. `followUps` is `undefined` while the API does not answer it.
 */
export function FollowUpRounds({
  followUps,
  pullRequest,
  attemptCapUsd,
  startHere = true,
}: {
  followUps: ContributeFollowUps | null | undefined;
  pullRequest: Pick<ContributeAttemptPullRequest, 'prId' | 'state'>;
  /** The user's limit for one attempt, which a follow-up runs within. */
  attemptCapUsd?: number;
  /** Offer "Start a follow-up" here; off where the review-feedback card starts it on the threads chosen. */
  startHere?: boolean;
}) {
  if (followUps === undefined) {
    return (
      <p data-follow-ups="unavailable" className="text-sm text-muted-foreground">
        Follow-ups are not available yet.
      </p>
    );
  }
  if (!followUps) return null;

  const handedOff = followUps.handedOff || followUps.left <= 0;
  const state = handedOff ? 'handed-off' : followUps.currentAttemptId ? 'under-way' : 'ready';
  const open = pullRequest.state === 'OPEN';

  return (
    <div
      data-follow-ups={state}
      data-rounds-used={followUps.used}
      data-rounds-left={followUps.left}
      className="flex flex-col gap-2"
    >
      <span className="text-sm">
        {roundsText(followUps)}
        {handedOff && followUps.handedOffAt ? ` Handed to you on ${dayLabel(followUps.handedOffAt)}.` : ''}
      </span>
      {followUps.currentAttemptId ? (
        <Link
          href={attemptHref(followUps.currentAttemptId)}
          prefetch={false}
          className="text-sm font-semibold text-link"
        >
          See the follow-up →
        </Link>
      ) : null}
      {followUps.history?.length ? (
        <ol data-rounds={followUps.history.length} className="flex flex-col gap-1 text-sm">
          {followUps.history.map((round) => (
            <li key={round.attemptId} data-round={round.round}>
              <Link href={attemptHref(round.attemptId)} prefetch={false} className="hover:underline">
                {roundLineOf(round)}
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
      {canStartFollowUp(followUps) && open && startHere ? (
        <>
          <StartFollowUpButton prId={pullRequest.prId} />
          <span className="text-xs text-muted-foreground">
            The agent reads the reviews, comments and failing checks, adds commits and drafts replies, on your Claude
            key
            {typeof attemptCapUsd === 'number' ? ` within your ${usd(attemptCapUsd)} limit for one attempt` : ''}.
            Nothing is pushed or posted before you review it.
          </span>
        </>
      ) : null}
      {canStartFollowUp(followUps) && !open ? (
        <span className="text-xs text-muted-foreground">The pull request is not open, so no follow-up can start.</span>
      ) : null}
    </div>
  );
}
