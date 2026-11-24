import type {
  ContributeAttemptDetail,
  ContributeFollowUpRound,
  ContributeReplyDraft,
  ContributeThreadOutcome,
} from './contribute.types';

/**
 * The follow-up flow (2026-10-31): the review threads waiting on a pull request, the agent's run as four steps, what
 * it did about each thread, and the round it adds up to. Pure, so the screens and their specs read the same words.
 */

/** The most comments one run addresses (the API's). */
export const FOLLOW_UP_THREADS_MAX = 20;

/** The run's steps as the user sees them, in order. */
export const FOLLOW_UP_STEPS = ['reading', 'fixing', 'checks', 'ready'] as const;
type FollowUpStep = (typeof FOLLOW_UP_STEPS)[number];

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
  NEEDS_YOU: { label: 'Question for you', tone: 'amber', hint: 'Only you can decide this one.' },
  NO_REPLY: { label: 'No reply needed', tone: 'neutral', hint: 'Its last word asks nothing of you.' },
};

/** A draft of the follow-up flow: one per thread the user chose, with its outcome (absent on an older API). */
export const hasOutcomes = (drafts: ContributeReplyDraft[] | undefined): drafts is ContributeReplyDraft[] =>
  Array.isArray(drafts) && drafts.some((draft) => draft.outcome !== undefined);

/** A commit as GitHub links it: seven characters. */
export const shortSha = (sha: string | null | undefined) =>
  sha && /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : null;

/** What a round did with the threads: `5 fixed`, `2 replied`…; none it did not do. */
export const roundTalliesOf = (round: ContributeFollowUpRound): string[] =>
  [
    round.fixed ? `${round.fixed} fixed` : null,
    round.skipped ? `${round.skipped} not changed` : null,
    round.needsYou ? `${round.needsYou} for you` : null,
    round.replied ? `${round.replied} replied` : null,
    round.resolved ? `${round.resolved} resolved` : null,
  ].filter((tally) => tally !== null);
