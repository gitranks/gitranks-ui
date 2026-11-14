import { isOwnAgent, timeLabel } from './attempt-format';
import { sendsByDefault } from './comment-actions';
import type {
  ContributeAttemptDetail,
  ContributeReplyDraft,
  ContributeReplyWaiting,
  ContributeView,
} from './contribute.types';
import { isSuspended } from './contribute-state';
import type { Move, MoveKind, MoveTone, RunVariant, SessionRef } from './contribution-moves';
import { hasOutcomes, shortSha } from './follow-up-flow';
import { timeLeftLabel } from './format';
import type { ActionId } from './hard-stop';
import { GROUPS, isGrantBounce, shortLeftOf } from './needs-you';
import { inOneComment, isHeldBack, isToApprove } from './one-comment';
import { commitsOf } from './patch';
import { BLOCK_REASONS, type RunTrouble, reasonKeyOf, replyTroubleOf } from './reply-trouble';
import { bounceOf, runNameOf } from './session-status';

/**
 * The moves a contribution's sessions hold as sessions (2026-11-13): the first attempt's review, autopilot's countdown,
 * a retry; a run's review, countdown and push that came back; and each run's replies left out or refused. Each with
 * its card's words. Pure: `contributionMovesOf` puts them in order.
 */

export const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** The run's number: its round, the history's, else (the run under way, not listed yet) one past the runs listed. */
export function runRoundOf(first: ContributeAttemptDetail | undefined, run: ContributeAttemptDetail): number | null {
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
export function runReadyOf(run: ContributeAttemptDetail, round: number | null): Move {
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
export const readySince = (attempt: ContributeAttemptDetail) => attempt.reviewAt ?? attempt.updatedAt;

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
export function firstMovesOf(
  view: ContributeView,
  first: ContributeAttemptDetail,
  now: Date,
  blocked: ReadonlySet<ActionId>,
) {
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
export function runMovesOf(view: ContributeView, run: ContributeAttemptDetail, round: number | null, now: Date) {
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
export type RunRead = { attemptId: string; state: string; round: number | null };

/** The reply moves of each run: replies left out of a push still to post, and replies GitHub did not take. */
/** The replies-not-posted card's title: refused, refused as one comment, or held back by the run's plan. */
export function notPostedTitleOf(failed: ContributeReplyDraft[], heldBack: ContributeReplyDraft[]): string {
  const count = failed.length + heldBack.length;
  if (!failed.length) return count === 1 ? 'A reply was held back' : `Your ${count} replies were held back`;
  if (!heldBack.length && failed.every(inOneComment)) {
    return count === 1 ? "Your reply didn't post as a comment" : `Your ${count} replies didn't post as one comment`;
  }
  return count === 1 ? "One reply didn't post" : `Your ${count} replies didn't reach GitHub`;
}

export function replyMovesOf({
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
    // Held back, or waiting for the run's first reply: not to approve (the first is said as not posted).
    const waiting = list.filter((draft) => isToApprove(draft) && !(approved && draft.send === true));
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
    const heldBack = list.filter(isHeldBack);
    const trouble: RunTrouble | undefined =
      replyTroubleOf(list).find((each) => each.runId === runId) ??
      (heldBack.length ? { runId, failed: [], shared: [], alone: [] } : undefined);
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
        title: notPostedTitleOf(trouble.failed, heldBack),
        chip: name,
        actions: ['post_reply'],
        data: { card: 'reply-failed', runId, round, trouble, pushed, heldBack },
      });
    }
  }
  return [...unsent, ...failed];
}
