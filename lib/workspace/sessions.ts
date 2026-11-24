import type { Route } from 'next';

import type { Tone } from './attempt-format';
import type { ContributeAttemptDetail } from './contribute.types';
import { pullRequestByAttemptPath, pullRequestPath, WORKSPACE_PATHS } from './paths';
import { type ProofStage, proofStageOf } from './proof';

/**
 * Where a contribution's page is: its first attempt, and the page's own address (by repo and issue, or an earlier
 * attempt's under it, `pullRequestPath`). Its sessions sit under that address, so moving between them keeps the
 * contribution's layout (its header and sessions) and reads only the session.
 */
type PageAt = { firstId: string; base: Route };

/** A page known only by its first attempt's id (no repo name): the address by attempt, which finds it. */
const byAttemptBase = (at: PageAt) => at.base.startsWith(`${WORKSPACE_PATHS.pullRequests}/by-attempt/`);

/**
 * A session's address on the page: the first attempt's is the page itself, a run's is beneath it (or, on a page known
 * only by its id, the run's own address by attempt).
 */
export const sessionPath = (at: PageAt, attemptId: string): Route =>
  attemptId === at.firstId
    ? at.base
    : byAttemptBase(at)
      ? pullRequestByAttemptPath(attemptId)
      : (`${at.base}/runs/${encodeURIComponent(attemptId)}` as Route);

/**
 * The page a contribution's first attempt is on: `base` when the page says it (an earlier attempt's sits under the
 * issue's), else the issue's own address from the attempt's repo and number.
 */
export const pageAtOf = (
  first: Pick<ContributeAttemptDetail, 'attemptId' | 'nameWithOwner' | 'number'>,
  base?: Route,
): PageAt => ({
  firstId: first.attemptId,
  base:
    base ??
    (first.nameWithOwner
      ? pullRequestPath({ repo: first.nameWithOwner, issue: first.number })
      : pullRequestByAttemptPath(first.attemptId)),
});

/**
 * The page's address in the browser's path, a run's segment aside: what a client part of the page builds its sessions'
 * addresses from.
 */
export const pageBaseOf = (pathname: string) => pathname.replace(/\/runs\/[^/]+\/?$/, '').replace(/\/$/, '') as Route;

/** What the sessions are called: a Contribute pull request's first attempt and runs, or a Learn one's. */
export type SessionNames = { first: string; run: (round: number) => string };

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

/** The next run is recommended: GitRanks sees something a run can act on, or review comments wait for an answer. */
export const nextRoundRecommended = (first: ContributeAttemptDetail): boolean =>
  !!first.followUps?.recommended || waitingThreadsOf(first).length > 0;

/** The review threads that wait for an answer: those not ignored in an earlier run. */
export const waitingThreadsOf = (first: ContributeAttemptDetail) =>
  first.pullRequest?.state === 'OPEN' ? (first.reviewFeedback?.threads ?? []).filter(({ ignored }) => !ignored) : [];

/** What the tiles read of the contribution's model: each session's pill, the next tile's title and the moves' kinds. */
export type TileModel = {
  sessions: Partial<Record<string, { pill: { label: string; tone: Tone; live?: boolean } }>>;
  nextTileTitle: string | null;
  proofStage: ProofStage | null;
  moves: { session: string; kinds: string[]; card: string }[];
};

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
