import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeCheckStatus,
  ContributeFeedbackThread,
  ContributeFollowUpRound,
  ContributeFollowUps,
  ContributeNeedsYou,
  ContributeReplyDraft,
  ContributeThreadOutcome,
} from './contribute.types';

/**
 * The follow-up flow (2026-10-31): the review threads waiting on a pull request, the agent's run as four steps, what
 * it did about each thread, and the round it adds up to. Pure, so the screens and their specs read the same words.
 */

/** The run's steps as the user sees them, in order. */
export const FOLLOW_UP_STEPS = ['reading', 'fixing', 'checks', 'ready'] as const;
export type FollowUpStep = (typeof FOLLOW_UP_STEPS)[number];
export const FOLLOW_UP_STEP_LABELS: Record<FollowUpStep, string> = {
  reading: 'Reading comments',
  fixing: 'Fixing',
  checks: 'Checks',
  ready: 'Ready for you',
};

/** The timeline's mark of the work phase: the go/no-go said go and the work was sent (contrib's `go:` note). */
const WORK_SENT = /^go:/;

/**
 * Where a follow-up's run stands: reading the comments (queued, or deciding), fixing (the work sent), our checks, or
 * ready. Null once it is past its review (pushing, pushed) or ended.
 */
export function followUpStepOf(attempt: Pick<ContributeAttemptDetail, 'state' | 'events'>): FollowUpStep | null {
  switch (attempt.state) {
    case 'QUEUED':
      return 'reading';
    case 'RUNNING':
      return attempt.events?.some((event) => WORK_SENT.test(event.detail ?? '')) ? 'fixing' : 'reading';
    case 'CHECKS':
      return 'checks';
    case 'REVIEW':
    case 'PENDING_AUTOSUBMIT':
      return 'ready';
    default:
      return null;
  }
}

/** Each outcome as a pill: what the agent did about the thread. */
export const OUTCOMES: Record<
  ContributeThreadOutcome,
  { label: string; tone: 'green' | 'neutral' | 'amber'; hint: string }
> = {
  FIXED: { label: 'Fixed', tone: 'green', hint: 'The new commits address it.' },
  SKIPPED: { label: 'Not changed', tone: 'neutral', hint: 'The agent left the code as it is, and says why.' },
  NEEDS_YOU: { label: 'Needs you', tone: 'amber', hint: 'Only you can decide this one.' },
};

/** Our checks in plain words, with the tone the result card shows them in. */
export const CHECK_STATUSES: Record<ContributeCheckStatus, { title: string; tone: 'green' | 'amber' | 'red' }> = {
  PASSED: { title: 'Checks passed', tone: 'green' },
  FAILED: { title: 'A test failed', tone: 'red' },
  NOT_RUN: { title: 'The tests could not run', tone: 'amber' },
  BLOCKED: { title: 'Our checks block this push', tone: 'red' },
};

/** A draft of the follow-up flow: one per thread the user chose, with its outcome (absent on an older API). */
export const hasOutcomes = (drafts: ContributeReplyDraft[] | undefined): drafts is ContributeReplyDraft[] =>
  Array.isArray(drafts) && drafts.some((draft) => draft.outcome !== undefined);

/** The waiting threads by who opened them: bots' (CodeRabbit, Copilot) and people's, each in the API's order. */
export function threadsByWho<T extends { bot?: boolean }>(threads: T[]): { bots: T[]; people: T[] } {
  return { bots: threads.filter((thread) => thread.bot === true), people: threads.filter((thread) => !thread.bot) };
}

/** The threads a new round can take: waiting, and not ignored before (those are listed apart). */
export const openThreadsOf = (threads: ContributeFeedbackThread[]) => threads.filter((thread) => !thread.ignored);

/** `src/a.ts:12`, or nothing for a thread on the whole diff. */
export const whereOfThread = (thread: { path: string | null; line: number | null }) =>
  thread.path ? `${thread.path}${thread.line ? `:${thread.line}` : ''}` : '';

/** A commit as GitHub links it: seven characters. */
export const shortSha = (sha: string | null | undefined) =>
  sha && /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : null;

/**
 * A round as one line: "Round 1 pushed 46de700 · 5 fixed · 2 replied · 2 resolved", or what it came to when nothing
 * was pushed ("Round 2 discarded, nothing pushed").
 */
export function roundLineOf(round: ContributeFollowUpRound): string {
  const head = `Round ${round.round}`;
  const sha = shortSha(round.pushedSha);
  const tallies = [
    round.fixed ? `${round.fixed} fixed` : null,
    round.skipped ? `${round.skipped} not changed` : null,
    round.needsYou ? `${round.needsYou} for you` : null,
    round.replied ? `${round.replied} replied` : null,
    round.resolved ? `${round.resolved} resolved` : null,
  ].filter(Boolean);
  const tail = tallies.length ? ` · ${tallies.join(' · ')}` : '';
  switch (round.state) {
    case 'DONE':
      return `${head} ${sha ? `pushed ${sha}` : 'done, no commits'}${tail}`;
    case 'DISCARDED':
      return `${head} discarded, nothing pushed`;
    case 'STOPPED':
      return `${head} stopped, nothing pushed`;
    case 'REVIEW':
    case 'PENDING_AUTOSUBMIT':
      return `${head} waiting for you${tail}`;
    case 'SUBMITTING':
      return `${head} pushing${tail}`;
    default:
      return `${head} under way`;
  }
}

/** The reply as it will read on GitHub: its prefix ("Fixed in <the new commit>: ") and the text. */
export function replyPreviewOf(prefix: string | null | undefined, text: string): string {
  const shown = (prefix ?? '').replace('<commit>', 'the new commit');
  return `${shown}${text.trim()}`;
}

/** What happened to a thread after the push, in a few words; null while it waits. */
export function threadAfterOf(draft: ContributeReplyDraft): string | null {
  if (draft.state === 'POSTING') return 'Posting the reply…';
  if (draft.state === 'FAILED') return draft.lastError?.note || 'The reply was not posted.';
  if (draft.state !== 'POSTED') return null;
  if (draft.resolveState === 'RESOLVED') return 'Replied and resolved';
  if (draft.resolveState === 'RESOLVING') return 'Replied, resolving the thread…';
  if (draft.resolveState === 'FAILED') return draft.lastError?.note || 'Replied; the thread could not be resolved.';
  return draft.comment ? 'Replied, left open for its reviewer' : 'Posted';
}

/**
 * An open pull request's row on My contributions (the owner, 2026-11-01: the follow-ups "take too much space" there):
 * one short label of what waits on its attempt page, where every follow-up control lives. Null: nothing waits.
 */
export function prNeedsYouLabelOf(
  pr: { needsYou?: ContributeNeedsYou | null; followUps?: ContributeFollowUps | null },
  drafts: readonly Pick<ContributeReplyDraft, 'state'>[],
  current: Pick<ContributeAttempt, 'state'> | undefined,
): string | null {
  if (pr.followUps?.currentAttemptId) {
    return current?.state === 'REVIEW' || current?.state === 'PENDING_AUTOSUBMIT'
      ? 'Follow-up ready'
      : 'Follow-up under way';
  }
  const waiting = drafts.filter(({ state }) => state === 'DRAFT' || state === 'FAILED').length;
  if (waiting) return `${waiting} ${waiting === 1 ? 'reply' : 'replies'} to approve`;
  const kinds = new Set((pr.needsYou?.signals ?? []).map(({ kind }) => kind));
  if (kinds.has('CHANGES_REQUESTED')) return 'Changes requested';
  if (kinds.has('COMMENT')) return 'Comments to address';
  if (kinds.has('CHECK_FAILED')) return 'A check failed';
  if (kinds.has('CLA')) return 'A CLA to sign';
  // A kind this UI does not know yet still says something.
  return kinds.size ? 'Something changed on it' : null;
}
