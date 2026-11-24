import type { ContributeFollowUps, ContributePrSignal, ContributePrSignalKind } from './contribute.types';
import { type ContributeErrorCode, contributeErrorMessage } from './errors';
import { dayLabel } from './format';

/** What the last read of the pull request found, in plain words. */
export const SIGNALS: Record<ContributePrSignalKind, string> = {
  CHANGES_REQUESTED: 'A reviewer asked for changes',
  COMMENT: 'Someone else commented on it',
  CHECK_FAILED: 'A check started failing',
  CLA: 'Sign the contributor license agreement (CLA)',
  TITLE: "The title breaks the repo's rules (retitle it on the pull request's page)",
  BOT_BLOCKED: 'A review bot blocks the merge',
  RUN_ENDED: 'A run ended with nothing pushed',
  DCO: 'A sign-off (DCO) is missing on the commits',
  SILENT: 'No one has looked at it for 30 days',
  REPO_OUT: 'The repo is out of GitRanks Contribute',
  CHECK_YOURS: 'A check only you can clear',
  CONVERSATION: "Someone commented in the pull request's conversation",
};

/** Every kind this UI knows: what "Mark as handled" may name. */
export const PR_SIGNAL_KINDS = Object.keys(SIGNALS) as ContributePrSignalKind[];

/** The day GitRanks closes a silent pull request (`SILENT`'s detail, an ISO day or time), as `Dec 1`; '' if unread. */
const silentCloseDayOf = (detail: string | null | undefined): string => dayLabel(detail?.trim() || null);

/** "No one has looked at this PR for 30 days. We'll close it on Dec 1 to keep your profile tidy." */
export function silentTextOf(detail: string | null | undefined): string {
  const day = silentCloseDayOf(detail);
  return `No one has looked at this PR for 30 days. We'll close it ${day ? `on ${day}` : 'soon'} to keep your profile tidy.`;
}

/** Why a repo left Contribute (`REPO_OUT`'s detail): a maintainer's word when closing a PR, or our PRs left unanswered. */
export type RepoOutReason = 'closed_no_ai' | 'hostile_close' | 'pr_misses';

const REPO_OUT_WHY: Record<RepoOutReason, string> = {
  closed_no_ai: 'a maintainer said it takes no AI-made PRs',
  hostile_close: 'a maintainer asked us to stay away',
  pr_misses: 'it has left our PRs unanswered',
};

/** The reason a `REPO_OUT` signal names; null for none, or one this UI does not know yet. */
export function repoOutReasonOf(detail: string | null | undefined): RepoOutReason | null {
  const reason = detail?.trim().toLowerCase();
  return reason === 'closed_no_ai' || reason === 'hostile_close' || reason === 'pr_misses' ? reason : null;
}

/**
 * The repo's own no: a maintainer said it takes no AI-made PRs, or asked us to stay away (`REPO_OUT`). No run is
 * offered on its pull requests then, whatever else waits on them. Not for `pr_misses`: that leaves the shared pool only.
 */
export const repoSaidNoOf = (signals: readonly ContributePrSignal[] | null | undefined): boolean =>
  (signals ?? []).some(({ kind, detail }) => {
    const reason = kind === 'REPO_OUT' ? repoOutReasonOf(detail) : null;
    return reason === 'closed_no_ai' || reason === 'hostile_close';
  });

/** Why the repo is out, in the user's words: "This repo is out of Contribute: … You may want to close this PR." */
export function repoOutTextOf(reason: RepoOutReason | null): string {
  if (reason === 'pr_misses') {
    return 'This repo has left our PRs unanswered; it is out of the shared pool for 90 days.';
  }
  return reason
    ? `This repo is out of Contribute: ${REPO_OUT_WHY[reason]}. You may want to close this PR.`
    : 'This repo is out of Contribute. You may want to close this PR.';
}

/** The longest note the user can give a follow-up's agent (the API's). */
export const FOLLOW_UP_NOTE_MAX = 2_000;

/** Autopilot's share of the pull request's runs, when its line shows: started so far, and whether it stopped. */
export function autopilotLineOf(
  followUps: Pick<ContributeFollowUps, 'autopilotRuns' | 'autopilotMax' | 'manualRuns' | 'history'>,
) {
  if (followUps.manualRuns > 0) {
    // The first run the user started, when the runs are listed.
    const mine = followUps.history?.find((run) => run.by === 'user')?.round;
    return `Autopilot stays off on this pull request: you started ${mine ? `run ${mine}` : 'a run'} yourself.`;
  }
  if (followUps.autopilotRuns >= followUps.autopilotMax) {
    return `Autopilot has started its ${followUps.autopilotMax} runs here; any more are yours to start.`;
  }
  return `Autopilot has started ${followUps.autopilotRuns} of its ${followUps.autopilotMax} runs here. A run you start yourself turns autopilot off on this pull request.`;
}

/** Why a follow-up could not start, from the API's refusal, in our words. */
const FOLLOW_UP_REFUSALS: [RegExp, string][] = [
  [/not open/i, 'The pull request is no longer open, so there is nothing to follow up.'],
  [/under way/i, 'A follow-up is already running on this pull request. Wait for it to come back here.'],
  [
    /no branch/i,
    'You opened this pull request yourself, so it has no branch of ours a run can add commits to. Make the change on GitHub.',
  ],
  [/paused on our side/i, 'New agent sessions are paused on our side for now. Try again later.'],
  [
    /contributing is paused/i,
    'Contributing is paused. Connect a working Claude key on the Agent tab, under Claude API key, then start the run.',
  ],
  [
    /key/i,
    'Your Claude key cannot start a session now: none is connected, Anthropic refused it, or its credits ran out. Connect a working one on the Agent tab, under Claude API key, then start the run.',
  ],
  [
    /limit/i,
    'Your spend limits leave no room for another run now. Raise them, or lower Each run, in Budget and pacing on the Agent tab, or wait until they reset.',
  ],
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

/**
 * What a follow-up cannot do: sign a CLA, retitle (no commit), give the proof a review bot asks of the user, what a run
 * that ended left for them, sign off the commits already pushed, keep a silent pull request open, close one in a
 * repo that left Contribute, clear a check only the user can, or read a comment in the conversation (theirs to answer;
 * they may still start a run with a note).
 */
export const USERS_SIGNALS = new Set<ContributePrSignal['kind']>([
  'CLA',
  'TITLE',
  'BOT_BLOCKED',
  'RUN_ENDED',
  'DCO',
  'SILENT',
  'REPO_OUT',
  'CHECK_YOURS',
  'CONVERSATION',
]);

/**
 * The kinds whose "I've replied" and "I've done it" always name them, whatever else is held: marking one handled never
 * clears a signal that arrived after the page was read.
 */
const OWN_HANDLED = new Set<ContributePrSignalKind>(['CONVERSATION', 'CHECK_YOURS']);

/**
 * Whether "Mark as handled" for `kinds` may clear the pull request's signals as a whole: they are every kind held (so
 * an API that does not take `kinds` yet clears the same), and none of them always names itself.
 */
export function clearsAllOf(
  held: readonly ContributePrSignalKind[],
  kinds: readonly ContributePrSignalKind[],
): boolean {
  const all = new Set(held);
  return (
    !kinds.some((kind) => OWN_HANDLED.has(kind)) && all.size === kinds.length && kinds.every((kind) => all.has(kind))
  );
}

/** The kinds "Mark as handled" sends: the ones named, or none (every signal) when they are all of them. */
export const handledKindsOf = (
  kinds: ContributePrSignalKind[] | undefined,
  all: boolean,
): ContributePrSignalKind[] | undefined => (kinds && !all ? kinds : undefined);

/** Whether a follow-up could act on what the pull request needs: anything but the user's own (`USERS_SIGNALS`). */
export const followUpCanHelp = (signals: readonly ContributePrSignal[] | null | undefined): boolean =>
  (signals ?? []).some((signal) => !USERS_SIGNALS.has(signal.kind));

/** Why "Mark as handled" did not go through, for the user. */
export function handledErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'NOT_FOUND') return 'This pull request is gone, or it is no longer yours. Reload the page.';
  if (error === 'INVALID' && /not open/i.test(message ?? '')) {
    return 'The pull request is no longer open. Reload the page to see how it ended.';
  }
  if (error === 'INVALID' && /changed meanwhile/i.test(message ?? '')) {
    return 'The pull request changed just now. Reload the page and try again.';
  }
  return contributeErrorMessage(error, message);
}

/** The title a follow-up's approval carries: the API needs one, and ignores it for a follow-up. */
export const followUpApprovalTitle = (prNumber: number | null | undefined) =>
  prNumber ? `Follow-up on pull request #${prNumber}` : 'Follow-up';
