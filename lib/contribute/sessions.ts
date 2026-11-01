import type { Route } from 'next';

import { ATTEMPT_STATES, isOwnAgent, type Tone, timeLabel } from './attempt-format';
import type { ContributeAttemptDetail, ContributeFollowUpRound } from './contribute.types';
import { roundTalliesOf, shortSha } from './follow-up-flow';
import { canStartFollowUp } from './follow-up-format';
import { usd } from './format';
import { parsePatch } from './patch';

/**
 * A contribution's sessions, as its page lists them: the first attempt, which opened the pull request, then each
 * follow-up round on it, then the next round while one may start (a draft: the comments to choose), or the note that
 * every round is used. One page for all of them; the session in its address is the one shown.
 */

/** The page's address for the round that has not started yet. */
export const NEXT_SESSION = 'next';

export const attemptPath = (attemptId: string) => `/contribute/attempts/${encodeURIComponent(attemptId)}` as Route;
export const nextSessionPath = (attemptId: string) => `${attemptPath(attemptId)}?session=${NEXT_SESSION}` as Route;

export type SessionCard = {
  key: string;
  /** Where its card leads; none for the note that every round is used. */
  href: Route | null;
  title: string;
  pill: { label: string; tone: Tone } | null;
  /** When, and what it cost: `Oct 31, 20:30 UTC · $0.25`. */
  meta: string;
  note: string | null;
  current: boolean;
  /** The next round, not started: its card is dashed. */
  draft?: boolean;
};

/** Whether the next round may start on the first attempt's pull request: open, a round left, none under way. */
export const nextRoundOpen = (first: ContributeAttemptDetail): boolean =>
  first.kind === 'FIRST' &&
  first.state === 'PR_OPEN' &&
  first.pullRequest?.state === 'OPEN' &&
  !!first.followUps &&
  canStartFollowUp(first.followUps);

/** The review threads that wait for an answer: those not ignored in an earlier round. */
export const waitingThreadsOf = (first: ContributeAttemptDetail) =>
  first.pullRequest?.state === 'OPEN' ? (first.reviewFeedback?.threads ?? []).filter(({ ignored }) => !ignored) : [];

const PR_PILLS = {
  OPEN: (number: number) => ({ label: `PR #${number} open`, tone: 'green' as const }),
  MERGED: (number: number) => ({ label: `PR #${number} merged`, tone: 'violet' as const }),
  CLOSED: (number: number) => ({ label: `PR #${number} closed`, tone: 'neutral' as const }),
};

/** A round's card pill, from where its line stands. */
function roundPillOf(round: ContributeFollowUpRound): { label: string; tone: Tone } {
  switch (round.state) {
    case 'DONE': {
      const sha = shortSha(round.pushedSha);
      return { label: sha ? `Pushed ${sha}` : 'Done', tone: 'green' };
    }
    case 'DISCARDED':
      return { label: 'Discarded', tone: 'neutral' };
    case 'STOPPED':
      return { label: 'Stopped', tone: 'neutral' };
    case 'REVIEW':
    case 'PENDING_AUTOSUBMIT':
      return { label: 'Ready for you', tone: 'violet' };
    case 'SUBMITTING':
      return { label: 'Pushing', tone: 'violet' };
    case 'QUEUED':
      return { label: 'Queued', tone: 'neutral' };
    default:
      return { label: 'Working', tone: 'violet' };
  }
}

const filesText = (patch: string | null | undefined) => {
  const files = parsePatch(patch).files.length;
  return files ? `${files} ${files === 1 ? 'file' : 'files'} changed` : null;
};

/** The first attempt's card: its pull request once there is one, else where it stands. */
function firstCardOf(first: ContributeAttemptDetail, current: boolean): SessionCard {
  const pr = first.pullRequest;
  const own = isOwnAgent(first);
  return {
    key: first.attemptId,
    href: attemptPath(first.attemptId),
    title: 'First attempt',
    // A state the UI does not know yet still names the pull request.
    pill: pr
      ? (PR_PILLS[pr.state as keyof typeof PR_PILLS]?.(pr.number) ?? { label: `PR #${pr.number}`, tone: 'neutral' })
      : (ATTEMPT_STATES[first.state] ?? null),
    meta: [timeLabel(first.createdAt), own ? 'your own agent' : usd(first.costUsd)].filter(Boolean).join(' · '),
    note: filesText(first.patch),
    current,
  };
}

/**
 * The sessions of the contribution whose first attempt is `first`, `selected` marked current (`next`: the round not
 * started). Each round comes from the pull request's history; one the history does not list yet (`selected`, just
 * started) is added from what was read of it.
 */
export function sessionsOf(
  first: ContributeAttemptDetail,
  selected: { attemptId: string; next: boolean },
  round?: ContributeAttemptDetail,
): SessionCard[] {
  const cards = [firstCardOf(first, !selected.next && selected.attemptId === first.attemptId)];
  const history = [...(first.followUps?.history ?? [])];
  const unlisted = (attemptId: string) => !history.some((entry) => entry.attemptId === attemptId);
  const add = (attemptId: string, state: ContributeFollowUpRound['state'], at: string) =>
    history.push({
      round: history.length + 1,
      attemptId,
      state,
      endReason: null,
      pushedSha: null,
      fixed: 0,
      skipped: 0,
      needsYou: 0,
      replied: 0,
      resolved: 0,
      at,
    });
  if (round && unlisted(round.attemptId)) add(round.attemptId, round.state, round.createdAt);
  // The round under way, before the history lists it: under way is all that is known of it.
  const current = first.followUps?.currentAttemptId;
  if (current && unlisted(current)) add(current, 'RUNNING', '');
  for (const entry of history) {
    const tallies = roundTalliesOf(entry);
    cards.push({
      key: entry.attemptId,
      href: attemptPath(entry.attemptId),
      title: `Round ${entry.round} · follow-up`,
      pill: roundPillOf(entry),
      meta: timeLabel(entry.at),
      note: tallies.length ? tallies.join(' · ') : null,
      current: !selected.next && selected.attemptId === entry.attemptId,
    });
  }

  const followUps = first.followUps;
  if (followUps && nextRoundOpen(first)) {
    const waiting = waitingThreadsOf(first).length;
    cards.push({
      key: NEXT_SESSION,
      href: nextSessionPath(first.attemptId),
      title: `Round ${followUps.used + 1} · follow-up`,
      pill: { label: 'Not started', tone: 'violet' },
      meta: followUps.left === 1 ? 'The last round' : `${followUps.left} rounds left`,
      note: waiting ? `${waiting} ${waiting === 1 ? 'comment' : 'comments'} waiting` : null,
      current: selected.next,
      draft: true,
    });
  } else if (followUps && followUps.used > 0 && (followUps.handedOff || followUps.left <= 0)) {
    cards.push({
      key: 'handed-off',
      href: null,
      title: 'No rounds left',
      pill: null,
      meta: followUps.handedOffAt ? `Handed to you ${timeLabel(followUps.handedOffAt)}` : '',
      note: 'Carry the pull request on on GitHub.',
      current: false,
      draft: true,
    });
  }
  return cards;
}
