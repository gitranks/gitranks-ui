import type {
  ContributeAttempt,
  ContributeAttemptState,
  ContributeFollowUps,
  ContributePrSignal,
  ContributePrSignalKind,
  ContributeReplyState,
} from './contribute.types';
import { type ContributeErrorCode, contributeErrorMessage } from './errors';
import { relativeLabel } from './format';

/** What the last read of the pull request found, in plain words. */
export const SIGNALS: Record<ContributePrSignalKind, string> = {
  CHANGES_REQUESTED: 'A reviewer asked for changes',
  COMMENT: 'Someone else commented on it',
  CHECK_FAILED: 'A check started failing',
  CLA: 'Sign the contributor license agreement (CLA)',
};

/** `A check started failing: lint, test · 2 hours ago`. */
export function signalText(signal: ContributePrSignal, now?: Date): string {
  const what = SIGNALS[signal.kind] ?? 'Something changed on it';
  const named = signal.kind === 'CHECK_FAILED' || signal.kind === 'CLA';
  const detail = named && signal.detail?.trim() ? `: ${signal.detail.trim()}` : '';
  const when = relativeLabel(signal.at, now);
  return `${what}${detail}${when ? ` · ${when}` : ''}`;
}

/** The pull request's rounds as a line: where it stands, and whether another follow-up may start. */
export function roundsText(followUps: ContributeFollowUps): string {
  if (followUps.handedOff || followUps.left <= 0) {
    return `All ${followUps.max} follow-up rounds are used, so this pull request is handed to you: carry it on on GitHub.`;
  }
  if (followUps.currentAttemptId) {
    return `A follow-up is under way: round ${Math.max(1, followUps.used)} of ${followUps.max}.`;
  }
  return `Follow-up round ${followUps.used + 1} of ${followUps.max} · ${followUps.left} left`;
}

/** A follow-up may start on the pull request now, as far as its rounds go. */
export const canStartFollowUp = (followUps: ContributeFollowUps) =>
  !followUps.handedOff && followUps.left > 0 && !followUps.currentAttemptId;

/** Why a follow-up could not start, from the API's refusal, in our words. */
const FOLLOW_UP_REFUSALS: [RegExp, string][] = [
  [/not open/i, 'The pull request is no longer open, so there is nothing to follow up.'],
  [/under way/i, 'A follow-up is already running on this pull request. Wait for it to finish.'],
  [/round.*used|no rounds/i, 'Every follow-up round is used: the pull request is yours to carry on on GitHub.'],
  [/no branch/i, 'This pull request has no branch of ours to add commits to.'],
  [/paused on our side/i, 'New agent sessions are paused on our side for now. Try again later.'],
  [/contributing is paused/i, 'Contributing is paused. Resume it in Settings, then start the follow-up.'],
  [/key/i, 'Your Claude key cannot start a session now. Check it under Keys and access in Settings.'],
  [/limit/i, 'Your spending limits leave no room for another attempt now. Try again once they do, or raise them.'],
  [
    /opted out|AI-assisted/i,
    "The repo's maintainers keep it out of GitRanks Contribute, so nothing more is sent there.",
  ],
];

/** Why a follow-up did not start, for the user. */
export function followUpErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'NOT_FOUND') return 'This pull request is gone, or it is no longer yours. Reload the page.';
  if (error === 'INVALID' && message) {
    const known = FOLLOW_UP_REFUSALS.find(([pattern]) => pattern.test(message));
    if (known) return known[1];
  }
  return contributeErrorMessage(error, message);
}

/** A refusal of a reply, in our words, and whether approving it again can help. */
export type ReplyRefusal = { text: string; final: boolean };

const REPLY_REFUSALS: [RegExp, ReplyRefusal][] = [
  [
    /never pushed/i,
    {
      text: "This reply is about the follow-up's commits, which were never pushed to the pull request, so it cannot be posted.",
      final: true,
    },
  ],
  [
    /not on the pull request yet|approve them first/i,
    {
      text: "This reply is about the follow-up's commits, which are not on the pull request yet. Push the commits first, then approve the reply.",
      final: true,
    },
  ],
  [/no longer open/i, { text: 'The pull request is no longer open, so the reply cannot be posted.', final: true }],
  [
    /opted out|AI-assisted/i,
    {
      text: "The repo's maintainers keep it out of GitRanks Contribute, so the reply cannot be posted.",
      final: true,
    },
  ],
];

/** Why a reply was not posted, for the user. */
export function replyRefusalOf(error: ContributeErrorCode, message?: string): ReplyRefusal {
  if (error === 'NOT_FOUND') {
    return { text: 'This reply is gone, or it is no longer yours. Reload the page.', final: true };
  }
  if (error === 'INVALID' && message) {
    const known = REPLY_REFUSALS.find(([pattern]) => pattern.test(message));
    if (known) return known[1];
  }
  return { text: contributeErrorMessage(error, message), final: false };
}

/** Why stopping autopilot did not go through, for the user. */
export function vetoErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'NOT_FOUND') return 'This attempt is gone, or it is no longer yours. Reload the page.';
  if (error === 'INVALID') {
    return /submitted/i.test(message ?? '')
      ? 'Autopilot submitted it just before. Reload the page to see the pull request.'
      : 'It is no longer waiting for autopilot. Reload the page to see where it stands.';
  }
  return contributeErrorMessage(error, message);
}

/** Why "Mark as handled" did not go through, for the user. */
export function handledErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'NOT_FOUND') return 'This pull request is gone, or it is no longer yours. Reload the page.';
  if (error === 'INVALID') {
    return /not open/i.test(message ?? '')
      ? 'The pull request is no longer open. Reload the page to see how it ended.'
      : 'The pull request changed just now. Reload the page and try again.';
  }
  return contributeErrorMessage(error, message);
}

/** A follow-up's state in a few words, beside the replies it drafted. */
export const FOLLOW_UP_STATES: Partial<Record<ContributeAttemptState, string>> = {
  QUEUED: 'starting',
  RUNNING: 'the agent is working',
  CHECKS: 'running our checks',
  REVIEW: 'waiting for your review',
  PENDING_AUTOSUBMIT: 'waiting for autopilot',
  SUBMITTING: 'pushing its commits',
  DONE: 'pushed to the pull request',
  STOPPED: 'stopped, nothing pushed',
  DISCARDED: 'discarded, nothing pushed',
};

/**
 * Why a reply drafted by `followUp` cannot be posted yet, when its commits are known: they must reach the pull request
 * first. Null when it can be approved (or when it is not known; the API then says).
 */
export function replyBlockOf(followUp: Pick<ContributeAttempt, 'state'> & { patch?: string | null }): string | null {
  if (!followUp.patch?.trim() || followUp.state === 'DONE') return null;
  if (followUp.state === 'STOPPED' || followUp.state === 'DISCARDED') {
    return "This reply is about the follow-up's commits, which were never pushed to the pull request, so it cannot be posted.";
  }
  return "This reply is about the follow-up's commits, which are not on the pull request yet. Push them first, then approve the reply.";
}

/** Each draft's state as a short label. */
export const REPLY_STATES: Record<
  ContributeReplyState,
  { label: string; tone: 'neutral' | 'violet' | 'green' | 'red' }
> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  POSTING: { label: 'Posting', tone: 'violet' },
  POSTED: { label: 'Posted', tone: 'green' },
  FAILED: { label: 'Not posted', tone: 'red' },
};

/** The title a follow-up's approval carries: the API needs one, and ignores it for a follow-up. */
export const followUpApprovalTitle = (prNumber: number | null | undefined) =>
  prNumber ? `Follow-up on pull request #${prNumber}` : 'Follow-up';
