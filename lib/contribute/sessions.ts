import type { Route } from 'next';

import { ATTEMPT_STATES, isOwnAgent, type Tone, timeLabel } from './attempt-format';
import type { ContributeAttemptDetail, ContributeFollowUpRound } from './contribute.types';
import { roundTalliesOf, shortSha } from './follow-up-flow';
import { usd } from './format';
import { parsePatch } from './patch';

/**
 * A contribution's sessions, as its page lists them: the first attempt, which opened the pull request, then each
 * follow-up run on it, then the next run while one may start (a draft: the comments to choose, the note to write). One
 * page for all of them; the session in its address is the one shown.
 */

/** The page's address for the run that has not started yet. */
export const NEXT_SESSION = 'next';

export const attemptPath = (attemptId: string) => `/contribute/attempts/${encodeURIComponent(attemptId)}` as Route;
export const nextSessionPath = (attemptId: string) => `${attemptPath(attemptId)}?session=${NEXT_SESSION}` as Route;

export type SessionCard = {
  key: string;
  /** Where its card leads. */
  href: Route | null;
  title: string;
  pill: { label: string; tone: Tone } | null;
  /** When, and what it cost: `Oct 31, 20:30 UTC · $0.25`. */
  meta: string;
  note: string | null;
  current: boolean;
  /** The next run, not started: its card is dashed. */
  draft?: boolean;
};

/**
 * Whether the next run may start on the first attempt's pull request: open, none under way, and its branch ours (a
 * pull request opened by hand takes no run). No cap on runs: whether anything waits only makes one recommended.
 */
export const nextRoundOpen = (first: ContributeAttemptDetail): boolean =>
  first.kind === 'FIRST' &&
  first.state === 'PR_OPEN' &&
  first.pullRequest?.state === 'OPEN' &&
  first.openedBy !== 'HAND' &&
  !!first.followUps &&
  !first.followUps.currentAttemptId;

/** The next run is recommended: GitRanks sees something a run can act on, or review comments wait for an answer. */
export const nextRoundRecommended = (first: ContributeAttemptDetail): boolean =>
  !!first.followUps?.recommended || waitingThreadsOf(first).length > 0;

/** The review threads that wait for an answer: those not ignored in an earlier run. */
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
    case 'CLAIMING':
    case 'RUNNING':
    case 'CHECKS':
      return { label: 'Working', tone: 'violet' };
    default:
      // A state the UI does not know yet: its own words, nothing implied.
      return { label: ATTEMPT_STATES[round.state]?.label ?? capitalized(String(round.state)), tone: 'neutral' };
  }
}

const capitalized = (text: string) =>
  text ? `${text[0].toUpperCase()}${text.slice(1).toLowerCase().replaceAll('_', ' ')}` : text;

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
 * The sessions of the contribution whose first attempt is `first`, `selected` marked current (`next`: the run not
 * started). Each run comes from the pull request's history; one the history does not list yet (`selected`, just
 * started) is added from what was read of it.
 */
export function sessionsOf(
  first: ContributeAttemptDetail,
  selected: { attemptId: string; next: boolean },
  round?: ContributeAttemptDetail,
): SessionCard[] {
  const cards = [firstCardOf(first, !selected.next && selected.attemptId === first.attemptId)];
  const history = [...(first.followUps?.history ?? [])];
  // Without the history, a run added here is the latest one: its number is the runs used.
  const numberOf = () => (first.followUps?.history ? history.length + 1 : first.followUps?.used || history.length + 1);
  const unlisted = (attemptId: string) => !history.some((entry) => entry.attemptId === attemptId);
  const add = (attemptId: string, state: ContributeFollowUpRound['state'], at: string, costUsd = 0) =>
    history.push({
      round: numberOf(),
      attemptId,
      by: 'user',
      trigger: null,
      reason: null,
      costUsd,
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
  if (round && unlisted(round.attemptId)) add(round.attemptId, round.state, round.createdAt, round.costUsd);
  // The run under way, before the history lists it: under way is all that is known of it.
  const current = first.followUps?.currentAttemptId;
  if (current && unlisted(current)) add(current, 'RUNNING', '');
  for (const entry of history) {
    const tallies = roundTalliesOf(entry);
    cards.push({
      key: entry.attemptId,
      href: attemptPath(entry.attemptId),
      title: `Run ${entry.round} · ${entry.by === 'autopilot' ? 'autopilot' : 'you'}`,
      pill: roundPillOf(entry),
      meta: [timeLabel(entry.at), entry.costUsd > 0 ? usd(entry.costUsd) : null].filter(Boolean).join(' · '),
      note: tallies.length ? tallies.join(' · ') : null,
      current: !selected.next && selected.attemptId === entry.attemptId,
    });
  }

  const followUps = first.followUps;
  if (followUps && nextRoundOpen(first)) {
    const waiting = waitingThreadsOf(first).length;
    const recommended = nextRoundRecommended(first);
    cards.push({
      key: NEXT_SESSION,
      href: nextSessionPath(first.attemptId),
      title: `Run ${Math.max(followUps.used, history.length) + 1} · follow-up`,
      pill: recommended ? { label: 'Recommended', tone: 'violet' } : { label: 'Not started', tone: 'neutral' },
      meta: recommended ? 'Not started' : 'Your call',
      note: waiting ? `${waiting} ${waiting === 1 ? 'comment' : 'comments'} waiting` : null,
      current: selected.next,
      draft: true,
    });
  }
  return cards;
}

/** The sessions header: the follow-up runs so far and what they cost (`2 runs · $0.43`); null before the first. */
export function runsLabelOf(first: ContributeAttemptDetail): string | null {
  const followUps = first.followUps;
  const runs = Math.max(followUps?.used ?? 0, followUps?.history?.length ?? 0);
  if (!runs) return null;
  const cost = (followUps?.history ?? []).reduce((sum, run) => sum + (run.costUsd ?? 0), 0);
  return [`${runs} ${runs === 1 ? 'run' : 'runs'}`, cost > 0 && !isOwnAgent(first) ? usd(cost) : null]
    .filter(Boolean)
    .join(' · ');
}
