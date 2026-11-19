import type { Route } from 'next';

import { ATTEMPT_STATES, isOwnAgent, type Tone, timeLabel } from './attempt-format';
import type { ContributeAttemptDetail, ContributeFollowUpRound } from './contribute.types';
import { dayLabel, usd } from './format';
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
  pill: { label: string; tone: Tone; live?: boolean } | null;
  /** When, and what it cost: `Oct 31 · $0.25`; for the next run, what waits for it. */
  meta: string;
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

/** The review threads that wait for an answer: those not ignored in an earlier run. */
export const waitingThreadsOf = (first: ContributeAttemptDetail) =>
  first.pullRequest?.state === 'OPEN' ? (first.reviewFeedback?.threads ?? []).filter(({ ignored }) => !ignored) : [];

/** The first attempt's card: its pill from the contribution's model (its pull request's state, or where it stands). */
function firstCardOf(first: ContributeAttemptDetail, model: TileModel): SessionCard {
  const own = isOwnAgent(first);
  return {
    key: first.attemptId,
    href: attemptPath(first.attemptId),
    title: 'First attempt',
    pill: model.sessions.first?.pill ?? ATTEMPT_STATES[first.state] ?? null,
    meta: [dayLabel(first.createdAt), own ? 'your own agent' : usd(first.costUsd)].filter(Boolean).join(' · '),
  };
}

/** What the tiles read of the contribution's model: each session's pill, the next tile's title and the moves' kinds. */
export type TileModel = {
  sessions: Partial<Record<string, { pill: { label: string; tone: Tone; live?: boolean } }>>;
  nextTileTitle: string | null;
  proofStage: ProofStage | null;
  moves: { session: string; kinds: string[]; card: string }[];
};

/**
 * The sessions of the contribution whose first attempt is `first`. Each run comes from the pull request's history; one
 * the history does not list yet (`round`, just started) is added from what was read of it. The list marks the one shown.
 */
export function sessionsOf(
  first: ContributeAttemptDetail,
  round: ContributeAttemptDetail | undefined,
  model: TileModel,
): SessionCard[] {
  const cards = [firstCardOf(first, model)];
  const history = [...(first.followUps?.history ?? [])];
  // Without the history, a run added here is the latest one: its number is the runs used.
  const numberOf = () => (first.followUps?.history ? history.length + 1 : first.followUps?.used || history.length + 1);
  const unlisted = (attemptId: string) => !history.some((entry) => entry.attemptId === attemptId);
  // Runs added here whose starter is not known: their card does not say who started them.
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
    const byAutopilot = entry.by === 'autopilot' && !whoUnknown.has(entry.attemptId);
    cards.push({
      key: entry.attemptId,
      href: sessionPath(first.attemptId, entry.attemptId),
      title: `Run ${entry.round}`,
      pill: model.sessions[`run:${entry.attemptId}`]?.pill ?? null,
      meta: [dayLabel(entry.at), entry.costUsd > 0 ? usd(entry.costUsd) : null, byAutopilot ? 'by autopilot' : null]
        .filter(Boolean)
        .join(' · '),
    });
  }

  // The proof the user's own agent captures, on the next step's page: its own stage words win over "Your move".
  const stage = model.proofStage;
  const moveOf = (sessions: string[], cardKind?: string) =>
    model.moves.find((move) => sessions.includes(move.session) && (!cardKind || move.card === cardKind));
  const withMove = (kind: string | undefined) =>
    (kind
      ? `${nextSessionPath(first.attemptId)}&move=${encodeURIComponent(kind)}`
      : nextSessionPath(first.attemptId)) as Route;
  if (stage) {
    const { meta } = PROOF_TILES[stage];
    const at = stage === 'posted' ? first.proof?.session?.stateAt : null;
    cards.push({
      // The next step's address shows the proof's line or card: its tile is the one the list marks there.
      key: NEXT_SESSION,
      href: withMove(moveOf(['proof'])?.kinds[0]),
      title: 'Proof',
      pill: model.sessions.proof?.pill ?? null,
      meta: at ? `${meta} ${timeLabel(at)}` : meta,
    });
  }

  if (model.nextTileTitle) {
    const waiting = waitingThreadsOf(first).length;
    const holds = !!moveOf(['next']);
    cards.push({
      // Beside a proof's tile (which takes the next step's mark), the run's own key.
      key: stage ? NEXT_RUN_TILE : NEXT_SESSION,
      href: withMove(moveOf(['next'], 'next-run')?.kinds[0]),
      title: model.nextTileTitle,
      pill: model.sessions.next?.pill ?? { label: 'Not started', tone: 'neutral' },
      meta: waiting
        ? `${waiting} ${waiting === 1 ? 'comment waits' : 'comments wait'}`
        : holds
          ? 'Waits for you'
          : 'Your call',
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

/** A proof's tile: whose move it is, in the tile's line (its pill is the model's). */
const PROOF_TILES: Record<ProofStage, { meta: string }> = {
  'not-connected': { meta: 'Waits for you' },
  connected: { meta: 'Waits for you' },
  working: { meta: 'Under way' },
  review: { meta: 'Waits for you' },
  cannot: { meta: 'Waits for you' },
  'fix-broken': { meta: 'Waits for you' },
  unreadable: { meta: 'Waits for you' },
  posting: { meta: 'Under way' },
  failed: { meta: 'Waits for you' },
  posted: { meta: 'Posted' },
  'ask-cleared': { meta: 'The bot no longer asks' },
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
