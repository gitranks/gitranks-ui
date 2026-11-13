import { ATTEMPT_STATES, isOwnAgent, type Tone, wordsOf } from './attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeFollowUpRound,
  ContributePrNotes,
  ContributePrSignal,
  ContributePrSignalKind,
  ContributeReplyDraft,
  ContributeReplyWaiting,
  ContributeView,
} from './contribute.types';
import { shortSha } from './follow-up-flow';
import { type RepoOutReason, repoSaidNoOf } from './follow-up-format';
import { type ActionId, type HardStop, hardStopOf } from './hard-stop';
import { firstMovesOf, type RunRead, replyMovesOf, runMovesOf, runRoundOf, timeOf } from './move-cards';
import { prCardsOf } from './move-cards-pr';
import type { NeedsYouKind } from './needs-you';
import type { RunFinding, UserMove } from './next-step';
import type { ContributePrConventionIssue, ContributePrFix } from './pr-conventions';
import { agentConnectedOf, type ProofStage } from './proof';
import type { RunTrouble } from './reply-trouble';
import { mayStartOf, pickOf } from './session-head-logic';
import { type BounceWords, firstStatusOf, nextStatusOf, roundLeadOf, runStatusOf } from './session-status';
import { nextRunNumberOf, proofTileStageOf, waitingThreadsOf } from './sessions';

export { runFlowOf, runReadyTitleOf, runRoundOf } from './move-cards';
export { addressTitleOf, ruleItemTitleOf } from './move-cards-pr';

/**
 * A contribution's moves (2026-11-13): what waits for the user on it, in Needs you's order, which session holds each
 * (the first attempt, a run, the next step, the proof), with the words of its card and its tone; and each session's
 * pill. The rail and the session head read the same model, so they always agree. Which moves exist, who holds them and
 * their order come only from the first attempt, the run under way, the pull request's waiting replies and the
 * maintainers' say; the session shown (`shown`) only fills its own lines. Pure.
 */

export type SessionRef = 'first' | `run:${string}` | 'next' | 'proof';
export type MoveKind = NeedsYouKind | 'threads' | 'run-recommended' | 'retry';
export type CardKind =
  | 'review'
  | 'own-review'
  | 'grant'
  | 'autopilot'
  | 'retry'
  | 'run-ready'
  | 'run-autopilot'
  | 'reply-failed'
  | 'replies'
  | 'next-run'
  | 'found'
  | 'rules'
  | 'dco'
  | 'agreement'
  | 'stopped'
  | 'repo-out'
  | 'silent'
  | 'proof';
export type MoveTone = 'violet' | 'amber' | 'red';

/** Why no run may take what waits: the PR was opened by hand, the repo said no, or a maintainer stopped our work. */
export type NoRun = 'hand' | 'said-no' | 'stopped';

/** One rule the open pull request breaks, as the rules card lists it. `failed`: a one-click fix for it did not go. */
export type RuleItem = {
  kind: 'title' | 'description' | 'changelog' | 'cla';
  /** The rule's issue; null for a title the repo's check flags with no rule read (a signal alone). */
  issue: ContributePrConventionIssue | null;
  failed: boolean;
};

/** A run that ended and is the next step's to tell: what it found or why it stopped. */
export type RunVariant = 'ready' | 'tests' | 'blocked' | 'bounced' | 'branch-conflict' | 'older';

export type MoveData =
  | { card: 'review'; attemptId: string; bounce: BounceWords | null }
  | { card: 'own-review'; attemptId: string; bounce: BounceWords | null; leftLabel: string | null }
  | { card: 'grant'; attemptId: string; round: number | null; reason: string; run: boolean }
  | { card: 'autopilot'; attemptId: string; at: string | null | undefined }
  | { card: 'retry'; attemptId: string; retry: 'BOOST' | 'OVERRIDE' }
  | { card: 'run-ready'; attemptId: string; round: number | null; variant: RunVariant; commits: number }
  | { card: 'run-autopilot'; attemptId: string; round: number | null; at: string | null | undefined }
  | { card: 'reply-failed'; runId: string; round: number | null; trouble: RunTrouble; pushed: boolean }
  | { card: 'replies'; runId: string; round: number | null; drafts: ContributeReplyDraft[] }
  | {
      card: 'next-run';
      round: number;
      /** No run may add: the card sends the user to GitHub. */
      noRun: NoRun | null;
      signals: ContributePrSignal[];
      kinds: ContributePrSignalKind[];
      threads: number;
      note: string;
    }
  | (Extract<UserMove, { kind: 'agreement' }> & { card: 'agreement' })
  | { card: 'rules'; items: RuleItem[]; fix: ContributePrFix | null }
  | { card: 'dco'; variant: 'ours' | 'failed' | 'sent' | 'by-hand'; fix: ContributePrFix | null }
  | (Extract<UserMove, { kind: 'found' }> & { card: 'found' })
  | (Extract<UserMove, { kind: 'stopped' }> & { card: 'stopped'; round: number; noRun: NoRun | null })
  | { card: 'repo-out'; reason: RepoOutReason | null; at: string }
  | { card: 'silent'; closesOn: string | null; at: string }
  | (Extract<UserMove, { kind: 'proof' }> & { card: 'proof'; round: number; mayStart: boolean });

export type Move = {
  card: CardKind;
  /** Every kind the card covers here; `kinds[0]` is its `?move=` id. */
  kinds: MoveKind[];
  session: SessionRef;
  tone: MoveTone;
  /** "Run 2 · ready for you", "Title rule". */
  kindLine: string;
  /** The card's title, and its "Also waiting" row. */
  title: string;
  /** The row's pill: "First attempt", "Run 2", "Next step", "Proof". */
  chip: string;
  /** The controls' actions, as a hard stop reads them. */
  actions: ActionId[];
  data: MoveData;
};

export type SessionPill = { label: string; tone: Tone; live?: boolean };

export type ContributionMoves = {
  moves: Move[];
  sessions: Partial<Record<SessionRef, { pill: SessionPill; statusLead: string | null }>>;
  /** The next tile's title: "Run N" while a run may start, "Next step" while only the user's moves wait there. */
  nextTileTitle: string | null;
  hardStop: HardStop | null;
  /** A run may start: the PR is ours and open, none under way, and nothing stops it. */
  mayStart: boolean;
  /** Why no run may take what waits, while one could otherwise. */
  noRun: NoRun | null;
  /** The proof's stage while its tile shows. */
  proofStage: ProofStage | null;
  /** A run pushed and the pull request is not read again yet: the next step's moves are held back. */
  reading: boolean;
  /** A sign-off is on its way: the DCO move is held back. */
  signingOff: boolean;
  /** The next run's number. */
  nextRound: number;
};

export type MovesInput = {
  view: ContributeView;
  /** The contribution's first attempt; undefined for a run whose first attempt is not known. */
  first?: ContributeAttemptDetail;
  /** The run under way (`loadAttempt(first.followUps.currentAttemptId)`). */
  current?: ContributeAttemptDetail;
  /** The page's own session: fills its own lines only. */
  shown?: ContributeAttemptDetail;
  /** The pull request's waiting replies; the model keeps those of its PR and not in a run's review. */
  replies?: ContributeReplyWaiting[];
  prNotes?: ContributePrNotes;
  now: Date;
};

/** The proof's tile, by its stage: its own words win over "Your move". */
const PROOF_PILLS: Record<ProofStage, SessionPill> = {
  'not-connected': { label: 'Your move', tone: 'amber' },
  connected: { label: 'Your move', tone: 'amber' },
  working: { label: 'Your agent', tone: 'violet' },
  review: { label: 'Check it', tone: 'amber' },
  cannot: { label: 'Your move', tone: 'amber' },
  'fix-broken': { label: 'Your move', tone: 'amber' },
  unreadable: { label: 'Your move', tone: 'amber' },
  posting: { label: 'Posting', tone: 'violet' },
  failed: { label: 'Posting failed', tone: 'red' },
  posted: { label: 'Bot reads it', tone: 'neutral' },
  'ask-cleared': { label: 'Not needed', tone: 'neutral' },
};

/** The proof's line while nothing waits on it: the title of its status. */
const PROOF_LEADS: Partial<Record<ProofStage, string>> = {
  working: 'Your agent is capturing the proof',
  posting: 'Posting the proof',
  posted: 'Proof posted',
  'ask-cleared': 'The bot no longer asks for proof',
};

const YOUR_MOVE: SessionPill = { label: 'Your move', tone: 'amber' };

/** The first attempt's pill, while it holds no move. */
function firstPillOf(first: ContributeAttemptDetail): SessionPill {
  const pr = first.pullRequest;
  if (pr) {
    if (pr.state === 'OPEN') return { label: 'PR open', tone: 'green' };
    if (pr.state === 'MERGED') return { label: 'Merged', tone: 'violet' };
    if (pr.state === 'CLOSED') return { label: 'Closed', tone: 'neutral' };
    return { label: `PR #${pr.number}`, tone: 'neutral' };
  }
  const own = isOwnAgent(first);
  switch (first.state) {
    case 'QUEUED':
      return { label: 'Queued', tone: 'neutral' };
    case 'CLAIMING':
      return { label: 'Starting', tone: 'violet' };
    case 'RUNNING':
      return own ? { label: 'Your agent', tone: 'violet' } : { label: 'Working', tone: 'violet', live: true };
    case 'CHECKS':
      return { label: 'Checking', tone: 'violet' };
    case 'SUBMITTING':
      return { label: 'Submitting', tone: 'violet' };
    case 'STOPPED':
      return first.endReason === 'SUBMIT_FAILED'
        ? { label: 'Failed', tone: 'red' }
        : { label: 'Stopped', tone: 'neutral' };
    case 'DISCARDED':
      return { label: 'Discarded', tone: 'neutral' };
    default:
      return ATTEMPT_STATES[first.state] ?? { label: wordsOf(String(first.state)), tone: 'neutral' };
  }
}

/** A run's pill, while it holds no move. */
export function runPillOf(
  run: Pick<ContributeFollowUpRound, 'state' | 'endReason' | 'pushedSha'>,
  own: boolean,
): SessionPill {
  switch (run.state) {
    case 'QUEUED':
      return { label: 'Queued', tone: 'neutral' };
    case 'CLAIMING':
      return { label: 'Starting', tone: 'violet' };
    case 'RUNNING':
    case 'CHECKS':
      return own ? { label: 'Your agent', tone: 'violet' } : { label: 'Working', tone: 'violet', live: true };
    case 'SUBMITTING':
      return { label: 'Pushing', tone: 'violet' };
    case 'DONE': {
      const sha = shortSha(run.pushedSha);
      return { label: sha ? `Pushed ${sha}` : 'Done', tone: 'green' };
    }
    case 'STOPPED':
      return run.endReason === 'SUBMIT_FAILED'
        ? { label: 'Failed', tone: 'red' }
        : { label: 'Stopped', tone: 'neutral' };
    case 'DISCARDED':
      return { label: 'Discarded', tone: 'neutral' };
    default:
      return ATTEMPT_STATES[run.state] ?? { label: wordsOf(String(run.state)), tone: 'neutral' };
  }
}

/** The contribution's moves, in order, and each session's pill. */
export function contributionMovesOf({
  view,
  first,
  current,
  shown,
  replies,
  prNotes,
  now,
}: MovesInput): ContributionMoves {
  const hardStop = hardStopOf({ first, prNotes });
  const blocked: ReadonlySet<ActionId> = hardStop?.blocked ?? new Set();
  const mayStart = mayStartOf(first, blocked);
  const nextRound = first ? nextRunNumberOf(first) : 1;
  const sessions: ContributionMoves['sessions'] = {};

  // A run whose first attempt is not known: its own moves only.
  if (!first) {
    const run = shown?.kind === 'FOLLOW_UP' ? shown : undefined;
    const round = run ? (run.round?.round ?? null) : null;
    const moves = run ? runMovesOf(view, run, round, now).map(({ group: _g, at: _a, ...move }) => move) : [];
    if (run) {
      sessions[`run:${run.attemptId}`] = {
        pill: moves.length
          ? YOUR_MOVE
          : runPillOf({ ...run, pushedSha: run.round?.pushedSha ?? null }, isOwnAgent(run)),
        statusLead: moves.length ? null : runStatusOf(run, { now, round }).title,
      };
    }
    return {
      moves,
      sessions,
      nextTileTitle: null,
      hardStop,
      mayStart: false,
      noRun: null,
      proofStage: null,
      reading: false,
      signingOff: false,
      nextRound,
    };
  }

  const pr = first.pullRequest;
  const open = pr?.state === 'OPEN';
  const followUps = first.followUps;
  const underWay = followUps?.currentAttemptId ?? null;
  const run = current && current.attemptId === underWay ? current : undefined;
  const history = followUps?.history ?? [];
  const signals = first.needsYou?.signals ?? [];
  const noRun: NoRun | null =
    open && !mayStart && !underWay
      ? hardStop?.kind === 'maintainer_stopped'
        ? 'stopped'
        : repoSaidNoOf(signals)
          ? 'said-no'
          : first.openedBy === 'HAND'
            ? 'hand'
            : null
      : null;

  // Right after a run pushed, what waits on the pull request is from before it: held back until the next read.
  const latest = history.at(-1);
  const reading =
    open &&
    !underWay &&
    !!followUps?.lastEndedAt &&
    timeOf(pr?.syncedAt) < timeOf(followUps.lastEndedAt) &&
    !signals.some(({ kind }) => kind === 'RUN_ENDED') &&
    (!latest || latest.state === 'DONE');
  const signingOff = first.prFix?.kind === 'SIGN_OFF' && first.prFix.state === 'SENDING';

  // The runs as the page knows them: the history, and the run under way before it lists it.
  const runs = new Map<string, RunRead>();
  for (const entry of history)
    runs.set(entry.attemptId, { attemptId: entry.attemptId, state: entry.state, round: entry.round });
  if (run) runs.set(run.attemptId, { attemptId: run.attemptId, state: run.state, round: runRoundOf(first, run) });

  // Session moves: the first attempt's before its pull request, the run under way's.
  const sessionMoves = [
    ...(pr ? [] : firstMovesOf(view, first, now, blocked)),
    ...(run ? runMovesOf(view, run, runRoundOf(first, run), now) : []),
  ].sort((a, b) => a.group - b.group || a.at - b.at);

  // The pull request's moves, in Needs you's order: held by the next step and the proof, and each run's replies.
  const prMoves: Move[] = [];
  if (open) {
    const drafts = (replies ?? []).filter((draft) => draft.prId === pr?.prId && !draft.inReview);
    const replyMoves = replyMovesOf({ first, drafts, runs });
    const { cards, replySlot } =
      underWay || reading
        ? { cards: [], replySlot: 0 }
        : prCardsOf({ first, view, now, mayStart, noRun, blocked, signingOff, round: nextRound });
    const slotted = [...cards, ...replyMoves.map((move, index) => ({ slot: replySlot + index / 1000, move }))].sort(
      (a, b) => a.slot - b.slot,
    );
    prMoves.push(...slotted.map(({ move }) => move));
  }

  const moves = [...sessionMoves.map(({ group: _g, at: _a, ...move }) => move), ...prMoves];
  const holds = (ref: SessionRef) => moves.some((move) => move.session === ref);

  // The first attempt.
  const firstLead = holds('first')
    ? null
    : firstStatusOf(first, {
        now,
        current: run,
        runNumber: run ? runRoundOf(first, run) : null,
        elsewhere: moves.length > 0,
      }).title;
  sessions.first = { pill: holds('first') ? YOUR_MOVE : firstPillOf(first), statusLead: firstLead };

  // Each run: the history's, and the one under way.
  const own = isOwnAgent(first);
  for (const entry of history) {
    const ref: SessionRef = `run:${entry.attemptId}`;
    const read = run?.attemptId === entry.attemptId ? run : shown?.attemptId === entry.attemptId ? shown : undefined;
    sessions[ref] = {
      pill: holds(ref) ? YOUR_MOVE : runPillOf(read ? { ...entry, state: read.state } : entry, own),
      statusLead: holds(ref)
        ? null
        : read
          ? runStatusOf(read, {
              now,
              round: entry.round,
              entry,
              reading: reading && latest?.attemptId === entry.attemptId,
            }).title
          : roundLeadOf(entry),
    };
  }
  if (run && !sessions[`run:${run.attemptId}`]) {
    const ref: SessionRef = `run:${run.attemptId}`;
    sessions[ref] = {
      pill: holds(ref) ? YOUR_MOVE : runPillOf({ ...run, pushedSha: run.round?.pushedSha ?? null }, own),
      statusLead: holds(ref) ? null : runStatusOf(run, { now, round: runRoundOf(first, run) }).title,
    };
  }
  // The run under way before the history lists it, not read: under way is all that is known of it.
  if (underWay && !sessions[`run:${underWay}`]) {
    sessions[`run:${underWay}`] = { pill: { label: 'Working', tone: 'violet', live: true }, statusLead: null };
  }
  // Runs that hold replies but neither the history nor the read lists.
  for (const move of moves) {
    if (move.session.startsWith('run:') && !sessions[move.session])
      sessions[move.session] = { pill: YOUR_MOVE, statusLead: null };
  }

  // The next step and the proof.
  const proofStage = open ? proofTileStageOf(first, agentConnectedOf(view), now) : null;
  if (proofStage) {
    // A stage that waits for the user but holds no move (a stop held it back): no "Your move", nothing to do there.
    const heldBack = !holds('proof') && !PROOF_LEADS[proofStage];
    sessions.proof = {
      pill: heldBack ? { label: 'Stopped', tone: 'neutral' } : PROOF_PILLS[proofStage],
      statusLead: holds('proof') ? null : (PROOF_LEADS[proofStage] ?? null),
    };
  }
  const threads = waitingThreadsOf(first).length;
  const nextHolds = holds('next');
  const nextTileTitle =
    !open || underWay
      ? null
      : mayStart
        ? `Run ${nextRound}`
        : nextHolds || (threads > 0 && !reading)
          ? 'Next step'
          : null;
  if (nextTileTitle) {
    sessions.next = {
      pill: nextHolds ? YOUR_MOVE : { label: 'Not started', tone: 'neutral' },
      statusLead: nextHolds
        ? null
        : nextStatusOf({ prNumber: pr?.number ?? 0, prUrl: null, waiting: threads, noRun, signingOff }).title,
    };
  }

  return { moves, sessions, nextTileTitle, hardStop, mayStart, noRun, proofStage, reading, signingOff, nextRound };
}

/** The panes a contribution shows: the first attempt, a run, or the next step (which shows the proof too). */
export type Pane = 'first' | `run:${string}` | 'next';

/** Whether a move shows on a pane: the next step's pane holds the proof's moves too. */
export const onPane = (move: Pick<Move, 'session'>, pane: Pane) =>
  pane === 'next' ? move.session === 'next' || move.session === 'proof' : move.session === pane;

/**
 * One pane's head: a card when the pane holds a move (the one `move` names, else its first), with every other move of
 * the contribution under it; else a status line, pointing at the move another session holds.
 */
export function headOf(
  model: ContributionMoves,
  pane: Pane,
  move?: string | null,
):
  | { kind: 'card'; shown: Move; held: Move[]; also: Move[] }
  | { kind: 'status'; lead: string; elsewhere: Move | null } {
  const held = model.moves.filter((each) => onPane(each, pane));
  if (held.length) {
    const shown = pickOf(held, move);
    return { kind: 'card', shown, held, also: model.moves.filter((each) => each !== shown) };
  }
  const ref: SessionRef = pane;
  return { kind: 'status', lead: model.sessions[ref]?.statusLead ?? '', elsewhere: model.moves[0] ?? null };
}

/** The shared reasons of the replies-not-posted move covering `attemptId`'s drafts; empty when there is none. */
export function cardReasonsOf(model: ContributionMoves, attemptId: string): ReadonlySet<string> {
  const move = model.moves.find((each) => each.data.card === 'reply-failed' && each.data.runId === attemptId);
  return new Set(move && move.data.card === 'reply-failed' ? move.data.trouble.shared.map(({ reason }) => reason) : []);
}

/** The words a status line's link says when the move is held elsewhere. */
export function elsewhereLabelOf(move: Pick<Move, 'session' | 'chip'>): string {
  if (move.session === 'next' || move.session === 'proof') return 'Your move is in the next step →';
  if (move.session === 'first') return 'Your move is on the first attempt →';
  return `Your move is on ${move.chip.toLowerCase()} →`;
}

export type { RunFinding };
