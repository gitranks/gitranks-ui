import { ATTEMPT_STATES, isOwnAgent, type Tone, timeLabel } from './attempt-format';
import { sendsByDefault } from './comment-actions';
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
import { isSuspended } from './contribute-state';
import { hasOutcomes, shortSha } from './follow-up-flow';
import { type RepoOutReason, repoSaidNoOf } from './follow-up-format';
import { timeLeftLabel } from './format';
import { type ActionId, type HardStop, hardStopOf } from './hard-stop';
import {
  type Candidate,
  candidatesOf,
  FIXED_BY,
  GROUPS,
  isGrantBounce,
  type NeedsYouKind,
  shortLeftOf,
} from './needs-you';
import { contributionOf, nextStepOf, type RunFinding, type UserMove } from './next-step';
import { commitsOf } from './patch';
import type { ContributePrConventionIssue, ContributePrFix } from './pr-conventions';
import { agentConnectedOf, type ProofStage } from './proof';
import { BLOCK_REASONS, type RunTrouble, reasonKeyOf, replyTroubleOf } from './reply-trouble';
import { mayStartOf, pickOf } from './session-head-logic';
import {
  type BounceWords,
  bounceOf,
  firstStatusOf,
  nextStatusOf,
  roundLeadOf,
  runNameOf,
  runStatusOf,
} from './session-status';
import { nextRunNumberOf, proofTileStageOf, waitingThreadsOf } from './sessions';

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

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** The kinds of the next-run card, in its `?move=` order. */
const RUN_KINDS: MoveKind[] = ['changes', 'comment', 'check', 'other', 'threads', 'run-recommended'];
/** The rules card's kinds, in its `?move=` order. */
const RULE_KINDS: MoveKind[] = ['title', 'description', 'changelog'];
const PROOF_KINDS: MoveKind[] = ['proof', 'proof-review', 'proof-failed'];
const FOUND_KINDS: MoveKind[] = ['bot', 'run-found'];

/** Needs you's pill words, for the PR-level cards' kind lines. */
const PILLS: Partial<Record<MoveKind, string>> = {
  changes: 'Changes requested',
  comment: 'New comment',
  check: 'Check failing',
  other: 'Something changed',
  threads: 'Review comments',
  'run-recommended': 'Recommended',
  replies: 'Replies to approve',
  agreement: 'Agreement to sign',
  title: 'Title rule',
  description: 'Description rule',
  changelog: 'Changelog rule',
  'fix-failed': 'A fix failed',
  bot: 'Bot blocks merge',
  'run-found': 'Only you can do this',
  dco: 'Sign-off missing',
  'repo-out': 'Repo out of Contribute',
  silent: 'No answer in 30 days',
  proof: 'Proof needed',
  'proof-review': 'Check the proof',
  'proof-failed': 'Posting failed',
};

/** The run's number: its round, the history's, else (the run under way, not listed yet) one past the runs listed. */
function roundOf(first: ContributeAttemptDetail | undefined, run: ContributeAttemptDetail): number | null {
  const listed = first?.followUps?.history?.find(({ attemptId }) => attemptId === run.attemptId)?.round;
  if (run.round?.round ?? listed) return run.round?.round ?? listed ?? null;
  const followUps = first?.followUps;
  if (!followUps || followUps.currentAttemptId !== run.attemptId) return null;
  return followUps.history ? followUps.history.length + 1 : followUps.used || 1;
}

/** The run speaks the follow-up flow: it answers our checks, or its drafts have outcomes. */
export const runFlowOf = (run: Pick<ContributeAttemptDetail, 'checkStatus' | 'replyDrafts'>) =>
  run.checkStatus !== undefined || hasOutcomes(run.replyDrafts);

/** "Push 2 commits and post 5 replies", "Push 2 commits", "Post 5 replies": what approving a run does. */
export function runReadyTitleOf(commits: number, replies: number): string {
  if (commits && replies) return `Push ${plural(commits, 'commit')} and post ${plural(replies, 'reply', 'replies')}`;
  if (commits) return `Push ${plural(commits, 'commit')}`;
  if (replies) return `Post ${plural(replies, 'reply', 'replies')}`;
  return 'Post the replies';
}

/** The run's ready card: its variant (our checks, a push that came back, an older API) and words. */
function runReadyOf(run: ContributeAttemptDetail, round: number | null): Move {
  const name = runNameOf(round);
  const commits = commitsOf(run.patch) || (run.patch?.trim() ? 1 : 0);
  const flow = runFlowOf(run);
  const error = run.submit?.lastError;
  const status = run.checkStatus?.status;
  const variant: RunVariant = error
    ? error.reason.trim().toLowerCase() === 'branch_conflict'
      ? 'branch-conflict'
      : 'bounced'
    : !flow
      ? 'older'
      : status === 'BLOCKED' && commits
        ? 'blocked'
        : status === 'FAILED' || status === 'NOT_RUN'
          ? 'tests'
          : 'ready';
  const replies = (run.replyDrafts ?? []).filter(sendsByDefault).length;
  const tone: MoveTone =
    variant === 'blocked'
      ? 'red'
      : variant === 'bounced'
        ? error?.reason.trim().toLowerCase() === 'org_restricted'
          ? 'amber'
          : 'red'
        : variant === 'tests' || variant === 'branch-conflict'
          ? 'amber'
          : 'violet';
  const title =
    variant === 'blocked'
      ? "These commits can't be pushed"
      : variant === 'bounced'
        ? `${name}'s push didn't go through`
        : variant === 'branch-conflict'
          ? `${name}'s commits can't go onto the branch now`
          : variant === 'older'
            ? commits
              ? 'Push the commits'
              : 'Finish the follow-up'
            : runReadyTitleOf(commits, replies);
  return {
    card: 'run-ready',
    kinds: ['run-ready'],
    session: `run:${run.attemptId}`,
    tone,
    kindLine:
      variant === 'bounced' || variant === 'branch-conflict' ? `${name} · the push failed` : `${name} · ready for you`,
    title,
    chip: name,
    actions: ['push', 'discard_run', 'post_reply', 'resolve_threads'],
    data: { card: 'run-ready', attemptId: run.attemptId, round, variant, commits },
  };
}

/** When a review became ready: its wait runs from it. */
const readySince = (attempt: ContributeAttemptDetail) => attempt.reviewAt ?? attempt.updatedAt;

/** "7 days left": how long a first attempt's review still waits. */
function reviewLeftOf(first: ContributeAttemptDetail, now: Date): string | null {
  const since = timeOf(readySince(first));
  if (!Number.isFinite(since)) return null;
  const days = Math.ceil((since + 7 * 24 * 3_600_000 - now.getTime()) / (24 * 3_600_000));
  return days >= 1 && days <= 7 ? `${plural(days, 'day')} left` : null;
}

/** How long the user's own agent's change still waits: its hold, else the 48 hours from its review. */
function ownLeftOf(first: ContributeAttemptDetail, now: Date): string | null {
  const lease = timeLeftLabel(first.leaseUntil, now);
  if (lease) return `${lease} left`;
  const since = timeOf(readySince(first));
  if (!Number.isFinite(since)) return null;
  const left = timeLeftLabel(new Date(since + 48 * 3_600_000).toISOString(), now);
  return left ? `${left} left` : null;
}

/** "Autopilot · 42 min left". */
const autopilotLineOf = (at: string | null | undefined, now: Date) => {
  const left = shortLeftOf(at, now);
  return left ? `Autopilot · ${left} left` : 'Autopilot';
};

/** The moves the first attempt holds while it has no pull request: its review, autopilot's countdown, a retry. */
function firstMovesOf(view: ContributeView, first: ContributeAttemptDetail, now: Date, blocked: ReadonlySet<ActionId>) {
  const moves: (Move & { group: number; at: number })[] = [];
  const chip = 'First attempt';
  const session: SessionRef = 'first';
  if (isGrantBounce(view, first)) {
    moves.push({
      card: 'grant',
      kinds: ['grant'],
      session,
      tone: 'amber',
      kindLine: 'First attempt · the submit failed',
      title: 'Allow GitHub access to open the pull request',
      chip,
      actions: [],
      data: {
        card: 'grant',
        attemptId: first.attemptId,
        round: null,
        reason: first.submit?.lastError?.reason ?? '',
        run: false,
      },
      group: GROUPS.grant,
      at: timeOf(readySince(first)),
    });
  } else if (first.state === 'PENDING_AUTOSUBMIT') {
    moves.push({
      card: 'autopilot',
      kinds: ['autopilot'],
      session,
      tone: 'amber',
      kindLine: autopilotLineOf(first.autosubmitAt, now),
      title: first.autosubmitAt
        ? `Autopilot opens this pull request at ${timeLabel(first.autosubmitAt).split(', ').at(-1)}`
        : first.autosubmitAt === null
          ? 'Autopilot opens this pull request an hour after its email'
          : 'Autopilot opens this pull request',
      chip,
      actions: [],
      data: { card: 'autopilot', attemptId: first.attemptId, at: first.autosubmitAt },
      group: GROUPS.autopilot,
      at: timeOf(first.autosubmitAt),
    });
  } else if (first.state === 'REVIEW') {
    const error = first.submit?.lastError ?? null;
    const bounce = error ? bounceOf(error, first.submit?.step) : null;
    const own = isOwnAgent(first);
    const left = own ? ownLeftOf(first, now) : reviewLeftOf(first, now);
    moves.push({
      card: own ? 'own-review' : 'review',
      kinds: [own ? 'own-review' : 'review'],
      session,
      tone: bounce ? bounce.tone : 'violet',
      kindLine: bounce
        ? 'First attempt · the submit failed'
        : ['First attempt · ready for you', left].filter(Boolean).join(' · '),
      title: bounce ? bounce.title : own ? 'Your agent sent a change' : 'Review the change, then open the pull request',
      chip,
      actions: [],
      data: own
        ? { card: 'own-review', attemptId: first.attemptId, bounce, leftLabel: left }
        : { card: 'review', attemptId: first.attemptId, bounce },
      group: GROUPS.review,
      at: timeOf(readySince(first)),
    });
  } else if (
    first.state === 'STOPPED' &&
    (first.retry?.kind === 'BOOST' || first.retry?.kind === 'OVERRIDE') &&
    !isSuspended(view) &&
    !blocked.has('retry')
  ) {
    moves.push({
      card: 'retry',
      kinds: ['retry'],
      session,
      tone: 'amber',
      kindLine: 'First attempt · stopped',
      title: first.retry.kind === 'BOOST' ? 'Retry with a bigger check budget' : 'Work on it anyway',
      chip,
      actions: ['retry'],
      data: { card: 'retry', attemptId: first.attemptId, retry: first.retry.kind },
      group: GROUPS.review,
      at: timeOf(first.updatedAt),
    });
  }
  return moves;
}

/** The moves a run holds as a session: its review, autopilot's countdown, a push that came back for GitHub access. */
function runMovesOf(view: ContributeView, run: ContributeAttemptDetail, round: number | null, now: Date) {
  const name = runNameOf(round);
  const session: SessionRef = `run:${run.attemptId}`;
  if (isGrantBounce(view, run)) {
    return [
      {
        card: 'grant' as const,
        kinds: ['grant'] as MoveKind[],
        session,
        tone: 'amber' as const,
        kindLine: `${name} · the push failed`,
        title: `Allow GitHub access to push ${round ? `run ${round}` : 'the run'}`,
        chip: name,
        actions: ['push' as const, 'discard_run' as const],
        data: {
          card: 'grant' as const,
          attemptId: run.attemptId,
          round,
          reason: run.submit?.lastError?.reason ?? '',
          run: true,
        },
        group: GROUPS.grant,
        at: timeOf(readySince(run)),
      },
    ];
  }
  if (run.state === 'PENDING_AUTOSUBMIT') {
    return [
      {
        card: 'run-autopilot' as const,
        kinds: ['run-autopilot'] as MoveKind[],
        session,
        tone: 'amber' as const,
        kindLine: autopilotLineOf(run.autosubmitAt, now),
        title: run.autosubmitAt
          ? `Autopilot pushes ${round ? `run ${round}` : 'the run'} at ${timeLabel(run.autosubmitAt).split(', ').at(-1)}`
          : `Autopilot pushes ${round ? `run ${round}` : 'the run'} soon`,
        chip: name,
        actions: [],
        data: { card: 'run-autopilot' as const, attemptId: run.attemptId, round, at: run.autosubmitAt },
        group: GROUPS.autopilot,
        at: timeOf(run.autosubmitAt),
      },
    ];
  }
  if (run.state === 'REVIEW') return [{ ...runReadyOf(run, round), group: GROUPS.review, at: timeOf(readySince(run)) }];
  return [];
}

/** A run's state, as the pull request's history or its own read says it. */
type RunRead = { attemptId: string; state: string; round: number | null };

/** The reply moves of each run: replies left out of a push still to post, and replies GitHub did not take. */
function replyMovesOf({
  first,
  drafts,
  runs,
}: {
  first: ContributeAttemptDetail;
  drafts: ContributeReplyWaiting[];
  runs: Map<string, RunRead>;
}): Move[] {
  const byRun = new Map<string, ContributeReplyWaiting[]>();
  for (const draft of drafts) {
    // A first attempt's own drafts (an older API) make no move: the comments' list says them.
    if (draft.attemptId === first.attemptId) continue;
    byRun.set(draft.attemptId, [...(byRun.get(draft.attemptId) ?? []), draft]);
  }
  const oldest = (list: ContributeReplyDraft[]) => Math.min(...list.map(({ createdAt }) => timeOf(createdAt)));
  const runsInOrder = [...byRun.entries()].sort(([, a], [, b]) => oldest(a) - oldest(b));
  const unsent: Move[] = [];
  const failed: Move[] = [];
  for (const [runId, list] of runsInOrder) {
    const run = runs.get(runId);
    const round = run?.round ?? null;
    const name = runNameOf(round);
    const approved = run?.state === 'SUBMITTING' || run?.state === 'DONE';
    const waiting = list.filter((draft) => draft.state === 'DRAFT' && !(approved && draft.send === true));
    if (waiting.length) {
      unsent.push({
        card: 'replies',
        kinds: ['replies'],
        session: `run:${runId}`,
        tone: 'amber',
        kindLine: 'Replies to approve',
        title:
          waiting.length === 1
            ? `A reply wasn't posted with ${round ? `run ${round}` : 'the run'}`
            : `${waiting.length} replies weren't posted with ${round ? `run ${round}` : 'the run'}`,
        chip: name,
        actions: ['post_reply'],
        data: { card: 'replies', runId, round, drafts: waiting },
      });
    }
    const trouble = replyTroubleOf(list).find((each) => each.runId === runId);
    if (trouble) {
      const blockedOnly = [...trouble.shared.map(({ reason }) => reason), ...trouble.alone.map(reasonKeyOf)].every(
        (reason) => BLOCK_REASONS.has(reason),
      );
      const pushed = !!shortSha(first.followUps?.history?.find(({ attemptId }) => attemptId === runId)?.pushedSha);
      failed.push({
        card: 'reply-failed',
        kinds: ['reply-failed'],
        session: `run:${runId}`,
        tone: blockedOnly ? 'amber' : 'red',
        kindLine: `${name} · replies not posted`,
        title:
          trouble.failed.length === 1
            ? "One reply didn't post"
            : `Your ${trouble.failed.length} replies didn't reach GitHub`,
        chip: name,
        actions: ['post_reply'],
        data: { card: 'reply-failed', runId, round, trouble, pushed },
      });
    }
  }
  return [...unsent, ...failed];
}

/** A PR move's card, from Needs you's reasons on the open pull request, in their order. */
type PrCard = { slot: number; move: Move };

/**
 * The open pull request's moves the next step and the proof hold, in Needs you's order (`candidatesOf`), each reason
 * on its card: the next run, an agreement, the rules, the sign-off, what a bot or a run left the user, a stopped run,
 * the repo out of Contribute, silence, the proof. `replySlot` marks where the reply moves go.
 */
function prCardsOf({
  first,
  view,
  now,
  mayStart,
  noRun,
  blocked,
  signingOff,
  round,
}: {
  first: ContributeAttemptDetail;
  view: ContributeView;
  now: Date;
  mayStart: boolean;
  noRun: NoRun | null;
  blocked: ReadonlySet<ActionId>;
  signingOff: boolean;
  round: number;
}): { cards: PrCard[]; replySlot: number } {
  const pr = contributionOf(first);
  if (!pr) return { cards: [], replySlot: 0 };
  const candidates = candidatesOf({ pr, drafts: [], runs: [], now });
  const step = nextStepOf(first, agentConnectedOf(view), now);
  const signals = first.needsYou?.signals ?? [];
  const threads = waitingThreadsOf(first).length;
  const fix = first.prFix ?? null;
  const fixedKind = fix?.state === 'FAILED' ? FIXED_BY[fix.kind] : undefined;
  const kindOf = (candidate: Candidate): NeedsYouKind =>
    candidate.kind === 'fix-failed' && fixedKind ? fixedKind : candidate.kind;
  const present = candidates.map(kindOf);
  const slotOf = (kind: NeedsYouKind) => present.indexOf(kind);
  const cards: PrCard[] = [];
  const next: SessionRef = 'next';
  const nextChip = 'Next step';

  // The reply slot: after the run's reasons Needs you lists first.
  const replySlot =
    (() => {
      const at = present.findIndex((kind) => !['changes', 'comment', 'check'].includes(kind));
      return at < 0 ? present.length : at;
    })() - 0.5;

  // The next run: one card for everything a run would act on.
  const runKinds = (['changes', 'comment', 'check', 'other'] as const).filter((kind) => present.includes(kind));
  const kinds: MoveKind[] = [...runKinds];
  if (mayStart && threads && !kinds.includes('changes') && !kinds.includes('comment')) kinds.push('threads');
  if (mayStart && !kinds.length && first.followUps?.recommended) kinds.push('run-recommended');
  if (kinds.length) {
    const ordered = RUN_KINDS.filter((kind) => kinds.includes(kind));
    const lead = ordered[0];
    const github = !mayStart;
    const slot =
      lead === 'threads'
        ? (slotOf('check') >= 0 ? slotOf('check') : replySlot) - 0.25
        : lead === 'run-recommended'
          ? (slotOf('check') >= 0 ? slotOf('check') : replySlot - 0.5) + 0.1
          : slotOf(lead as NeedsYouKind);
    const runSignals = step.run.signals;
    const check = signals.find(({ kind }) => kind === 'CHECK_FAILED')?.detail?.trim() || 'A check';
    const checks = check.includes(', ') ? 'checks' : 'check';
    const title = github
      ? lead === 'changes'
        ? 'Make the requested changes on GitHub'
        : lead === 'comment'
          ? 'Reply to the new comment on GitHub'
          : lead === 'check'
            ? `Fix ${check} on your branch`
            : 'See what changed on GitHub'
      : lead === 'changes' || lead === 'threads'
        ? threads
          ? addressTitleOf(waitingThreadsOf(first))
          : `Start run ${round} on the requested changes`
        : lead === 'comment'
          ? `Start run ${round} on the new comment`
          : lead === 'check'
            ? `Start run ${round} on the failing ${checks}`
            : lead === 'other'
              ? `Start run ${round} to look at it`
              : `Start run ${round}`;
    cards.push({
      slot,
      move: {
        card: 'next-run',
        kinds: ordered,
        session: next,
        tone: github ? 'amber' : 'violet',
        kindLine: PILLS[lead] ?? 'Next run',
        title,
        chip: nextChip,
        actions: github ? [] : ['start_run'],
        data: {
          card: 'next-run',
          round,
          noRun: github ? (noRun ?? 'stopped') : null,
          signals: runSignals,
          kinds: step.run.kinds,
          threads,
          note: step.run.note,
        },
      },
    });
  }

  // The agreement: a comment that signs it, or a page.
  const agreement = step.user.find((move) => move.kind === 'agreement');
  if (agreement && agreement.kind === 'agreement') {
    const kind: MoveKind = agreement.signComment ? 'agreement' : 'cla';
    cards.push({
      slot: slotOf(kind),
      move: {
        card: 'agreement',
        kinds: [kind],
        session: next,
        tone: 'amber',
        kindLine: agreement.signComment ? 'Agreement to sign' : `${agreement.agreement} to sign`,
        title: agreement.signComment
          ? `Sign the ${agreement.agreement} with a comment`
          : `Sign the ${agreement.agreement}`,
        chip: nextChip,
        actions: [],
        data: { ...agreement, card: 'agreement' },
      },
    });
  }

  // The rules: the title, the description, the changelog, a CLA rule with no CLA signal; a fix that failed in its place.
  const issues = first.prIssues ?? [];
  const hasCla = signals.some(({ kind }) => kind === 'CLA');
  const failedKind = fixedKind && RULE_KINDS.includes(fixedKind) ? fixedKind : null;
  const items: RuleItem[] = [];
  const titleIssue = issues.find(({ kind }) => kind === 'TITLE') ?? null;
  if (titleIssue || signals.some(({ kind }) => kind === 'TITLE')) {
    items.push({ kind: 'title', issue: titleIssue, failed: failedKind === 'title' });
  }
  const template = issues.find(({ kind }) => kind === 'TEMPLATE');
  if (template) items.push({ kind: 'description', issue: template, failed: failedKind === 'description' });
  const changelog = issues.find(({ kind }) => kind === 'CHANGELOG');
  if (changelog) items.push({ kind: 'changelog', issue: changelog, failed: failedKind === 'changelog' });
  const claIssue = !hasCla ? issues.find(({ kind }) => kind === 'CLA') : undefined;
  if (claIssue) items.push({ kind: 'cla', issue: claIssue, failed: false });
  const ruleSending = !!fix && fix.kind !== 'SIGN_OFF' && fix.state === 'SENDING';
  if (items.length) {
    const ruleKinds: MoveKind[] = RULE_KINDS.filter((kind) => items.some((item) => item.kind === kind));
    if (failedKind) ruleKinds.push('fix-failed');
    const claOnly = !ruleKinds.length;
    const ids: MoveKind[] = claOnly ? ['cla'] : ruleKinds;
    const one = items.length === 1 ? items[0] : null;
    const agreementName = first.conventions?.cla?.agreement ?? 'CLA';
    cards.push({
      slot: claOnly
        ? (slotOf('title') >= 0 ? slotOf('title') : replySlot + 0.4) - 0.1
        : slotOf(ruleKinds[0] as NeedsYouKind),
      move: {
        card: 'rules',
        kinds: ids,
        session: next,
        tone: failedKind ? 'red' : 'amber',
        kindLine: claOnly
          ? `${agreementName} to sign`
          : failedKind && ids[0] === failedKind
            ? 'A fix failed'
            : (PILLS[ids[0]] ?? 'Repo rules'),
        title: one
          ? ruleItemTitleOf(one, agreementName)
          : `The pull request breaks ${items.length} of the repo's rules`,
        chip: nextChip,
        actions: ['retitle', 'edit_description', 'fix_changelog', 'fix_link'],
        data: { card: 'rules', items, fix: ruleSending || failedKind ? fix : null },
      },
    });
  }

  // The proof, held by the proof's own session, shown on the next step.
  const proof = step.user.find((move) => move.kind === 'proof');
  if (proof && proof.kind === 'proof') {
    const proofKind: MoveKind | null =
      proof.stage === 'not-connected' || proof.stage === 'connected'
        ? 'proof'
        : proof.stage === 'review' ||
            proof.stage === 'cannot' ||
            proof.stage === 'fix-broken' ||
            proof.stage === 'unreadable'
          ? 'proof-review'
          : proof.stage === 'failed'
            ? 'proof-failed'
            : null;
    const dropped =
      (proof.stage === 'review' && blocked.has('post_proof')) ||
      (proof.stage === 'cannot' && blocked.has('proof_reply')) ||
      (proof.stage === 'fix-broken' && blocked.has('proof_fix')) ||
      (proof.stage === 'failed' && blocked.has('retry_proof'));
    if (proofKind && !dropped) {
      const slot = candidates.findIndex(
        ({ kind }) => PROOF_KINDS.includes(kind) || kind === 'proof-working' || kind === 'proof-posted',
      );
      cards.push({
        slot: slot >= 0 ? slot : replySlot + 0.6,
        move: {
          card: 'proof',
          kinds: [proofKind],
          session: 'proof',
          tone: proof.stage === 'fix-broken' || proof.stage === 'failed' ? 'red' : 'amber',
          kindLine: PILLS[proofKind] ?? 'Proof',
          title: PROOF_TITLES[proof.stage] ?? 'Prove the fix on your machine',
          chip: 'Proof',
          actions: ['post_proof', 'retry_proof', 'proof_reply', 'proof_fix'],
          data: { ...proof, card: 'proof', round, mayStart },
        },
      });
    }
  }

  // What a bot or a run left the user: one card, one "I've done it".
  const found = step.user.find((move) => move.kind === 'found');
  if (found && found.kind === 'found') {
    const foundKinds = FOUND_KINDS.filter((kind) => present.includes(kind as NeedsYouKind));
    if (foundKinds.length) {
      const by = found.bot?.by ?? 'the review bot';
      const runName = found.run?.round ? `run ${found.run.round}` : 'the last run';
      cards.push({
        slot: slotOf(foundKinds[0] as NeedsYouKind),
        move: {
          card: 'found',
          kinds: foundKinds,
          session: next,
          tone: 'amber',
          kindLine: found.bot ? 'Bot blocks merge' : 'Only you can do this',
          title: found.bot ? `Do what ${by} asks` : `What ${runName} left for you`,
          chip: nextChip,
          actions: [],
          data: { ...found, card: 'found' },
        },
      });
    }
  }

  // A run that stopped, or whose commits did not push.
  const stopped = step.user.find((move) => move.kind === 'stopped');
  if (stopped && stopped.kind === 'stopped') {
    const unpushed = stopped.run.outcome === 'push_failed';
    const kind: MoveKind = unpushed ? 'push-failed' : 'run-stopped';
    const name = stopped.run.round ? `Run ${stopped.run.round}` : 'The last run';
    cards.push({
      slot: slotOf(kind),
      move: {
        card: 'stopped',
        kinds: [kind],
        session: next,
        tone: 'red',
        kindLine: unpushed
          ? stopped.run.round
            ? `Run ${stopped.run.round} not pushed`
            : 'Push failed'
          : stopped.run.round
            ? `Run ${stopped.run.round} stopped`
            : 'Run stopped',
        title: unpushed ? `${name}'s commits weren't pushed` : `${name} stopped`,
        chip: nextChip,
        actions: ['start_run'],
        data: { ...stopped, card: 'stopped', round, noRun: mayStart ? null : (noRun ?? 'stopped') },
      },
    });
  }

  // The sign-off: GitRanks signs off and pushes, or the user does it by hand; held back while one is on its way.
  const dcoSignal = signals.some(({ kind }) => kind === 'DCO');
  const signOff = fix?.kind === 'SIGN_OFF' ? fix : null;
  if (dcoSignal && !signingOff) {
    const byHand = first.openedBy === 'HAND' || blocked.has('sign_off');
    const variant = byHand
      ? 'by-hand'
      : signOff?.state === 'FAILED'
        ? 'failed'
        : signOff?.state === 'DONE'
          ? 'sent'
          : 'ours';
    cards.push({
      slot: slotOf('dco'),
      move: {
        card: 'dco',
        kinds: variant === 'failed' ? ['dco', 'fix-failed'] : ['dco'],
        session: next,
        tone: variant === 'failed' ? 'red' : 'amber',
        kindLine: variant === 'failed' ? 'A fix failed' : 'Sign-off missing',
        title: byHand && first.openedBy === 'HAND' ? 'Sign off your commits' : 'Sign off the commits',
        chip: nextChip,
        actions: ['sign_off'],
        data: { card: 'dco', variant, fix: signOff },
      },
    });
  }

  // GitRanks' own: the repo left Contribute, or no answer in 30 days. Closing or keeping the PR is the user's call.
  const out = step.user.find((move) => move.kind === 'repo-out');
  if (out && out.kind === 'repo-out') {
    cards.push({
      slot: slotOf('repo-out'),
      move: {
        card: 'repo-out',
        kinds: ['repo-out'],
        session: next,
        tone: 'amber',
        kindLine: 'Repo out of Contribute',
        title: out.reason === 'pr_misses' ? 'Close or keep the pull request open' : 'The repo left Contribute',
        chip: nextChip,
        actions: [],
        data: { card: 'repo-out', reason: out.reason, at: out.at },
      },
    });
  }
  const silent = step.user.find((move) => move.kind === 'silent');
  if (silent && silent.kind === 'silent') {
    cards.push({
      slot: slotOf('silent'),
      move: {
        card: 'silent',
        kinds: ['silent'],
        session: next,
        tone: 'amber',
        kindLine: 'No answer in 30 days',
        title: 'No answer in 30 days',
        chip: nextChip,
        actions: [],
        data: { card: 'silent', closesOn: silent.closesOn, at: silent.at },
      },
    });
  }
  return { cards, replySlot };
}

/** `a`, `a and b`, `a, b and c`. */
const listed = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');

/**
 * "Address 7 comments from maintainer-mo and coderabbitai": the next-run card's title over the comments it takes; more
 * than three authors, "Address 9 review comments".
 */
export function addressTitleOf(threads: { author: string | null }[]): string {
  const authors = [...new Set(threads.map(({ author }) => author || 'a reviewer'))];
  const count = threads.length;
  if (authors.length > 3) return `Address ${count} review comments`;
  return `Address ${plural(count, 'comment')} from ${listed(authors)}`;
}

/** A rule item's title, as the rules card says it alone or among others. */
export function ruleItemTitleOf(item: RuleItem, agreement = 'CLA'): string {
  switch (item.kind) {
    case 'title':
      return 'Retitle the pull request';
    case 'description':
      return item.issue?.check ? 'Fix the description' : 'Fill in the description on GitHub';
    case 'changelog':
      return 'Fix the changelog line';
    case 'cla':
      return `Sign the ${agreement}`;
  }
}

/** The proof card's title, by its stage. */
const PROOF_TITLES: Partial<Record<ProofStage, string>> = {
  'not-connected': 'Prove the fix on your machine',
  connected: 'Run the proof prompt in your agent',
  review: 'Check the proof, then post it',
  cannot: "Your agent couldn't capture the proof",
  'fix-broken': "Your agent found the fix doesn't work",
  unreadable: "The proof can't be shown",
  failed: 'Posting the proof failed',
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
      return ATTEMPT_STATES[first.state] ?? { label: String(first.state), tone: 'neutral' };
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
      return ATTEMPT_STATES[run.state] ?? { label: String(run.state), tone: 'neutral' };
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
  if (run) runs.set(run.attemptId, { attemptId: run.attemptId, state: run.state, round: roundOf(first, run) });

  // Session moves: the first attempt's before its pull request, the run under way's.
  const sessionMoves = [
    ...(pr ? [] : firstMovesOf(view, first, now, blocked)),
    ...(run ? runMovesOf(view, run, roundOf(first, run), now) : []),
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
        runNumber: run ? roundOf(first, run) : null,
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
      statusLead: holds(ref) ? null : runStatusOf(run, { now, round: roundOf(first, run) }).title,
    };
  }
  // Runs that hold replies but neither the history nor the read lists.
  for (const move of moves) {
    if (move.session.startsWith('run:') && !sessions[move.session])
      sessions[move.session] = { pill: YOUR_MOVE, statusLead: null };
  }

  // The next step and the proof.
  const proofStage = open ? proofTileStageOf(first, agentConnectedOf(view), now) : null;
  if (proofStage) {
    sessions.proof = {
      pill: PROOF_PILLS[proofStage],
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
