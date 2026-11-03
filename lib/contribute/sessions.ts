import type { Route } from 'next';

import { ATTEMPT_STATES, isOwnAgent, type Tone, timeLabel } from './attempt-format';
import type { ContributeAttemptDetail, ContributeFollowUpRound } from './contribute.types';
import { roundTalliesOf, shortSha } from './follow-up-flow';
import { USERS_SIGNALS } from './follow-up-format';
import { usd } from './format';
import { parsePatch } from './patch';
import { type ProofStage, proofStageOf } from './proof';

/**
 * A contribution's sessions, as its page lists them: the first attempt, which opened the pull request, then each
 * follow-up run on it, then the next run while one may start (a draft: the comments to choose, the note to write). One
 * page for all of them; the session in its address is the one shown.
 */

/** The page's address for the run that has not started yet. */
export const NEXT_SESSION = 'next';

export const attemptPath = (attemptId: string) => `/contribute/attempts/${encodeURIComponent(attemptId)}` as Route;
export const nextSessionPath = (attemptId: string) => `${attemptPath(attemptId)}?session=${NEXT_SESSION}` as Route;
/**
 * A session's address under its contribution's first attempt: the first attempt's own, or a run's beneath it, so moving
 * between them keeps the contribution's layout (its header and sessions) and reads only the session. A run's own
 * address (`attemptPath`) still works: its page sends it here.
 */
export const sessionPath = (firstId: string, attemptId: string) =>
  attemptId === firstId
    ? attemptPath(firstId)
    : (`${attemptPath(firstId)}/runs/${encodeURIComponent(attemptId)}` as Route);

export type SessionCard = {
  key: string;
  /** Where its card leads. */
  href: Route | null;
  title: string;
  pill: { label: string; tone: Tone } | null;
  /** When, and what it cost: `Oct 31, 20:30 UTC · $0.25`. */
  meta: string;
  note: string | null;
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

/** The next run's number: one past the runs so far, as counted or as listed. */
export const nextRunNumberOf = (first: ContributeAttemptDetail): number =>
  Math.max(first.followUps?.used ?? 0, first.followUps?.history?.length ?? 0) + 1;

/** Who started a run read on its own: autopilot, the user, or null when its read does not say. */
function starterOf(run: ContributeAttemptDetail): ContributeFollowUpRound['by'] | null {
  if (run.followUpOf?.trigger === 'autopilot' || run.autopilot) return 'autopilot';
  return run.followUpOf?.trigger ? 'user' : null;
}

/** The next run is recommended: GitRanks sees something a run can act on, or review comments wait for an answer. */
export const nextRoundRecommended = (first: ContributeAttemptDetail): boolean =>
  !!first.followUps?.recommended || waitingThreadsOf(first).length > 0;

/** Only the user's moves wait on the pull request: an agreement, a bot's block, what a run left them, the rules. */
export const usersMovesWait = (first: ContributeAttemptDetail): boolean =>
  (first.needsYou?.signals ?? []).some(({ kind }) => USERS_SIGNALS.has(kind)) || !!first.prIssues?.length;

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
function firstCardOf(first: ContributeAttemptDetail): SessionCard {
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
  };
}

/**
 * The sessions of the contribution whose first attempt is `first`. Each run comes from the pull request's history; one
 * the history does not list yet (`round`, just started) is added from what was read of it. The list marks the one shown.
 */
export function sessionsOf(
  first: ContributeAttemptDetail,
  round?: ContributeAttemptDetail,
  proofOptions: { agentConnected: boolean; now?: Date } = { agentConnected: false },
): SessionCard[] {
  const cards = [firstCardOf(first)];
  const history = [...(first.followUps?.history ?? [])];
  // Without the history, a run added here is the latest one: its number is the runs used.
  const numberOf = () => (first.followUps?.history ? history.length + 1 : first.followUps?.used || history.length + 1);
  const unlisted = (attemptId: string) => !history.some((entry) => entry.attemptId === attemptId);
  // Runs added here whose starter is not known: their card names neither.
  const whoUnknown = new Set<string>();
  const add = (
    attemptId: string,
    state: ContributeFollowUpRound['state'],
    at: string,
    by: ContributeFollowUpRound['by'] | null,
    costUsd = 0,
  ) => {
    if (!by) whoUnknown.add(attemptId);
    history.push({
      round: numberOf(),
      attemptId,
      by: by ?? 'user',
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
  };
  if (round && unlisted(round.attemptId)) {
    add(round.attemptId, round.state, round.createdAt, starterOf(round), round.costUsd);
  }
  // The run under way, before the history lists it: under way is all that is known of it.
  const current = first.followUps?.currentAttemptId;
  if (current && unlisted(current)) add(current, 'RUNNING', '', null);
  for (const entry of history) {
    const tallies = roundTalliesOf(entry);
    cards.push({
      key: entry.attemptId,
      href: sessionPath(first.attemptId, entry.attemptId),
      title: `Run ${entry.round} · ${whoUnknown.has(entry.attemptId) ? 'follow-up' : entry.by === 'autopilot' ? 'autopilot' : 'you'}`,
      pill: roundPillOf(entry),
      meta: [timeLabel(entry.at), entry.costUsd > 0 ? usd(entry.costUsd) : null].filter(Boolean).join(' · '),
      note: tallies.length ? tallies.join(' · ') : null,
    });
  }

  // The proof the user's own agent captures, on the next step's page (shown while no run is under way): its card is there.
  const stage = proofTileStageOf(first, proofOptions.agentConnected, proofOptions.now ?? new Date());
  if (stage) {
    const { pill, meta } = PROOF_TILES[stage];
    const at = stage === 'posted' ? first.proof?.session?.stateAt : null;
    cards.push({
      // The next step's address shows the proof's card: its tile is the one the list marks there.
      key: NEXT_SESSION,
      href: nextSessionPath(first.attemptId),
      title: 'Proof · your agent',
      pill,
      meta: at ? `${meta} ${timeLabel(at)}` : meta,
      note: null,
    });
  }

  const followUps = first.followUps;
  if (followUps && nextRoundOpen(first)) {
    const waiting = waitingThreadsOf(first).length;
    const recommended = nextRoundRecommended(first);
    const yours = !recommended && usersMovesWait(first);
    cards.push({
      // Beside a proof's tile (which takes the next step's mark), the run's own key.
      key: stage ? NEXT_RUN_TILE : NEXT_SESSION,
      href: stage ? (`${nextSessionPath(first.attemptId)}#next-run` as Route) : nextSessionPath(first.attemptId),
      title: `Run ${nextRunNumberOf(first)} · follow-up`,
      pill: recommended
        ? { label: 'Recommended', tone: 'violet' }
        : yours
          ? { label: 'Your move', tone: 'amber' }
          : { label: 'Not started', tone: 'neutral' },
      meta: recommended ? 'Not started' : yours ? 'Waits for you' : 'Your call',
      note: waiting ? `${waiting} ${waiting === 1 ? 'comment' : 'comments'} waiting` : null,
      draft: true,
    });
  }
  return cards;
}

/**
 * The proof's stage when its tile and card show: on our own open pull request with no run under way. The next step's
 * page shows whenever this is not null, so the tile never leads to a page without the card.
 */
export const proofTileStageOf = (
  first: ContributeAttemptDetail,
  agentConnected: boolean,
  now: Date,
): ProofStage | null =>
  first.openedBy !== 'HAND' && first.pullRequest?.state === 'OPEN' && !first.followUps?.currentAttemptId
    ? proofStageOf(first.proof, agentConnected, now)
    : null;

/** The next run's tile beside a proof's: both lead to the next step, the run's to its card. */
export const NEXT_RUN_TILE = 'next-run';

/** A proof's tile: whose move it is, in the tile's pill and line. */
const PROOF_TILES: Record<ProofStage, { pill: SessionCard['pill']; meta: string }> = {
  'not-connected': { pill: { label: 'Your move', tone: 'amber' }, meta: 'Waits for you' },
  connected: { pill: { label: 'Your move', tone: 'amber' }, meta: 'Waits for you' },
  working: { pill: { label: 'Your agent', tone: 'violet' }, meta: 'Under way' },
  review: { pill: { label: 'Check it', tone: 'amber' }, meta: 'Waits for you' },
  cannot: { pill: { label: 'Your move', tone: 'amber' }, meta: 'Waits for you' },
  'fix-broken': { pill: { label: 'Your move', tone: 'amber' }, meta: 'Waits for you' },
  unreadable: { pill: { label: 'Your move', tone: 'amber' }, meta: 'Waits for you' },
  posting: { pill: { label: 'Posting', tone: 'violet' }, meta: 'Under way' },
  failed: { pill: { label: 'Posting failed', tone: 'red' }, meta: 'Waits for you' },
  posted: { pill: { label: 'Bot reads it', tone: 'neutral' }, meta: 'Posted' },
  'ask-cleared': { pill: { label: 'Not needed', tone: 'neutral' }, meta: 'The bot no longer asks' },
};

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
