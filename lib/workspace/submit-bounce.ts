import { timeLabel } from './attempt-format';
import type { ContributeSubmitError } from './contribute.types';
import { clipped } from './needs-you';

/**
 * A first attempt's submit that came back for approval, by the reason it came back: its tone, title, one sentence of
 * why, whether "Try again" can work yet, and the way past it (the fork, the organization, the repo's rules). And the
 * submit's steps as they settled, on one line. Pure: the review card and its specs read the same.
 */

/** The control beside "Try again" on a submit that came back: where the way past it is. */
export type BounceSecondary = 'org-access' | 'fork-sync' | 'fork-page' | 'fork-branches' | 'repo-rules' | null;

export type BounceWords = {
  tone: 'amber' | 'red';
  title: string;
  /** The one visible sentence. */
  why: string;
  /** "Try again" opens the form; none while the note's condition has not passed. */
  tryAgain: boolean;
  secondary: BounceSecondary;
  /** A line the Why disclosure adds. */
  more: string | null;
};

/** The repo's own limits that keep the change in review until they pass. */
const REPO_LIMITS = new Set(['repo_busy', 'repo_month_cap', 'repo_open_cap', 'repo_open_cap_all_users']);

const STEP_TITLES: Record<string, string> = {
  FORK: "Your fork wasn't created",
  SYNC: "Your fork couldn't be brought up to date",
  PUSH: "The push to your fork didn't go through",
  PULL_REQUEST: "The pull request didn't open",
};

/** The note's first sentence. */
export const firstSentence = (note: string | null | undefined): string => {
  const text = note?.trim() ?? '';
  const end = text.search(/[.!?](\s|$)/);
  return clipped(end >= 0 ? text.slice(0, end + 1) : text, 300);
};

/** What a first attempt's card says after a submit that came back for approval, by the reason it came back. */
export function bounceOf(error: ContributeSubmitError, step: string | null | undefined): BounceWords {
  const reason = error.reason.trim().toLowerCase();
  const why = firstSentence(error.note) || 'The last step did not go through.';
  const base = { why, tryAgain: true, secondary: null, more: null } as const;
  switch (reason) {
    case 'org_restricted':
      return {
        ...base,
        tone: 'amber',
        title: "The organization hasn't approved GitRanks yet",
        secondary: 'org-access',
        more: 'It goes through only once the organization approves the app.',
      };
    case 'sync_workflows':
      return { ...base, tone: 'amber', title: 'Sync your fork on GitHub, then try again', secondary: 'fork-sync' };
    case 'sync_conflict':
      return {
        ...base,
        tone: 'amber',
        title: "Your fork's default branch has commits of its own",
        secondary: 'fork-page',
      };
    case 'branch_conflict':
      return {
        ...base,
        tone: 'amber',
        title: 'Your fork already has a branch of this name',
        secondary: 'fork-branches',
      };
    case 'fork_timeout':
      return { ...base, tone: 'amber', title: 'GitHub is still making your fork', why: 'Try again in a few minutes.' };
    case 'invalid':
      return { ...base, tone: 'red', title: 'GitHub refused the pull request as invalid' };
    case 'no_contributor':
      return {
        ...base,
        tone: 'red',
        title: "Your GitHub login couldn't be read",
        why: 'Sign in again, then approve again.',
        tryAgain: false,
      };
    default:
      if (REPO_LIMITS.has(reason)) {
        return {
          ...base,
          tone: 'amber',
          title: 'The repo takes no more pull requests from GitRanks for now',
          tryAgain: false,
          secondary: 'repo-rules',
        };
      }
      return { ...base, tone: 'red', title: STEP_TITLES[String(step ?? '')] ?? "The submit didn't go through" };
  }
}

/** "Fork ✓ · Sync ✓ · Push ✕ · Nov 13, 09:19 UTC": a submit's steps as they settled, in one mono line. */
export function settledStepsOf(submit: {
  step: string;
  steps?: { step: string; doneAt: string | null }[] | null;
  lastError: ContributeSubmitError | null;
}): string {
  const order = ['FORK', 'SYNC', 'PUSH', 'PULL_REQUEST'];
  const words: Record<string, string> = { FORK: 'Fork', SYNC: 'Sync', PUSH: 'Push', PULL_REQUEST: 'Open PR' };
  const at = order.indexOf(submit.step);
  const marks = order.flatMap((step, index) => {
    const timed = submit.steps?.find((each) => each.step === step);
    const done = timed ? !!timed.doneAt : at > index;
    const failed = index === at && !!submit.lastError;
    // Steps not reached are left out: the line says how far it got.
    return failed || done ? [`${words[step]} ${failed ? '✕' : '✓'}`] : [];
  });
  // Nothing reached: no line (the note says when).
  if (!marks.length) return '';
  return [...marks, submit.lastError ? timeLabel(submit.lastError.at) : null].filter(Boolean).join(' · ');
}
