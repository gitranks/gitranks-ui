import type { ContributeAttempt, ContributeReplyWaiting } from './contribute.types';
import { firstSentenceOf, isHeldBack, isNoReply } from './one-comment';

/**
 * Needs you's row for a pull request's replies that did not post (2026-11-14): one row however many there are, led by
 * the most actionable case of one run's replies (a failed comment, replies held back, replies GitHub kept out of their
 * threads that can go as one comment, the rest), the others named in one closing sentence. Every button opens that
 * run's page, where its card posts: Needs you never posts by itself. Pure.
 */

/** The cases a row of replies not posted can lead with, in the order it takes them. */
export type ReplyCase =
  | 'comment-failed'
  | 'held-back'
  | 'one-comment-org'
  | 'one-comment'
  | 'as-comment'
  | 'retry-several'
  | 'retry-one';

const ORDER: ReplyCase[] = [
  'comment-failed',
  'held-back',
  'one-comment-org',
  'one-comment',
  'as-comment',
  'retry-several',
  'retry-one',
];

/** The row's words: its case, the run it is about, its pill, move and button. */
export type ReplyRowWords = {
  case: ReplyCase;
  runId: string;
  /** The replies the case covers. */
  drafts: ContributeReplyWaiting[];
  tone: 'red' | 'amber';
  pill: string;
  move: string;
  label: string;
};

/** A failed comment's Try again waits for GitHub access after these. */
const GRANT_REASONS: ReadonlySet<string> = new Set(['grant_missing', 'grant_revoked']);

const reasonOf = (draft: Pick<ContributeReplyWaiting, 'lastError'>) =>
  draft.lastError?.reason?.trim().toLowerCase() || 'unknown';

/** A sentence's end: one full stop, none doubled. */
const sentence = (text: string) => {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/** Text set in brackets inside a sentence: without its own closing full stop. */
const bracketed = (text: string) => text.trim().replace(/[.!?…]+$/, '');

/** A reply GitHub refused: the API's note (why, and what to do), else the two ways on. */
export const replyFailedMove = (draft: { lastError?: { note?: string | null } | null }): string => {
  const note = draft.lastError?.note?.replace(/\s+/g, ' ').trim();
  if (!note) {
    return "GitHub refused the reply. Retry it, or copy it from the run's page and post it on the pull request yourself.";
  }
  return sentence(note.length > 200 ? `${note.slice(0, 199).trimEnd()}…` : note);
};

/**
 * The replies that did not post and are the user's to act on: failed, or held back by the run's plan. Never a thread
 * the run found needs no reply: there is nothing to post for it.
 */
export const isUnposted = (draft: Pick<ContributeReplyWaiting, 'state' | 'heldBack' | 'outcome' | 'dismissedReason'>) =>
  !isNoReply(draft) && (draft.state === 'FAILED' || isHeldBack(draft));

/** One run's replies in each case, the first case first; empty cases left out. */
function casesOf(all: ContributeReplyWaiting[]): { case: ReplyCase; drafts: ContributeReplyWaiting[] }[] {
  const list = all.filter((draft) => !isNoReply(draft));
  const failed = list.filter((draft) => draft.state === 'FAILED');
  const inComment = failed.filter((draft) => !!draft.batchId);
  const held = list.filter(isHeldBack);
  const free = failed.filter((draft) => !draft.batchId);
  const asComment = free.filter((draft) => draft.canGoInOneComment === true);
  const others = free.filter((draft) => draft.canGoInOneComment !== true);
  const org = asComment.some((draft) => reasonOf(draft) === 'org_restricted');
  const byReason = new Map<string, ContributeReplyWaiting[]>();
  for (const draft of others) byReason.set(reasonOf(draft), [...(byReason.get(reasonOf(draft)) ?? []), draft]);
  const shared = [...byReason.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const cases: { case: ReplyCase; drafts: ContributeReplyWaiting[] }[] = [
    { case: 'comment-failed', drafts: inComment },
    { case: 'held-back', drafts: held },
    { case: asComment.length > 1 ? (org ? 'one-comment-org' : 'one-comment') : 'as-comment', drafts: asComment },
    shared.length > 1 ? { case: 'retry-several', drafts: shared } : { case: 'retry-one', drafts: others.slice(0, 1) },
  ];
  return cases.filter(({ drafts }) => drafts.length > 0);
}

/** The run's number, from the runs read; null when it is not among them. */
const roundOf = (runs: readonly Pick<ContributeAttempt, 'attemptId' | 'round'>[], runId: string) =>
  runs.find(({ attemptId }) => attemptId === runId)?.round?.round ?? null;

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};

/**
 * The lead's fixed code (the API's `replyTrouble` says the same): the case, and for a failed comment what its button
 * does (GitHub access first, Try again, Dismiss once the pull request is gone, else Copy all); a lone reply the
 * organization kept out of its thread says so.
 */
function troubleOf(lead: { case: ReplyCase; drafts: ContributeReplyWaiting[] }): string {
  const [one] = lead.drafts;
  if (lead.case === 'comment-failed') {
    const retry = lead.drafts.some((draft) => draft.batchRetry === 'RESEND' || draft.batchRetry === 'REBUILD');
    if (retry && GRANT_REASONS.has(reasonOf(one))) return 'comment-failed-grant';
    if (retry) return 'comment-failed-retry';
    return reasonOf(one) === 'not_found' ? 'comment-failed-dismiss' : 'comment-failed-copy';
  }
  if (lead.case === 'as-comment' && reasonOf(one) === 'org_restricted') return 'as-comment-org';
  return lead.case;
}

/**
 * A not-posted row's words, from its fixed code (`trouble`), how many replies it covers, the note it quotes (a
 * held-back reply's, else the error's: untrusted, plain text) and the organization (the owner part of the repo's
 * name). The page's own rows and the API's items say the same.
 */
function replyWordsOf({
  trouble,
  count,
  note,
  org,
}: {
  trouble: string;
  count: number;
  note: string | null | undefined;
  org: string;
}): Pick<ReplyRowWords, 'tone' | 'pill' | 'move' | 'label'> {
  const pill = count === 1 ? 'Reply not posted' : 'Replies not posted';
  const orgWords = `${org} only lets apps it has approved post in review threads`;
  if (trouble.startsWith('comment-failed')) {
    const said = firstSentenceOf(note);
    return {
      tone: 'red',
      pill,
      move: `${count === 1 ? "Your reply didn't post as a comment." : `Your ${count} replies didn't post as one comment.`}${said ? ` ${sentence(said)}` : ''}`,
      label:
        trouble === 'comment-failed-grant'
          ? 'Allow GitHub access'
          : trouble === 'comment-failed-retry'
            ? 'Try again'
            : trouble === 'comment-failed-dismiss'
              ? 'Dismiss'
              : `Copy all ${count}`,
    };
  }
  switch (trouble) {
    case 'held-back': {
      const why = bracketed(firstSentenceOf(note)) || 'it was not posted';
      return {
        tone: 'amber',
        pill,
        move:
          count === 1
            ? `Your reply was held back: the first one didn't reach its thread (${why}). Post it as a comment.`
            : `Your ${count} replies were held back: the first one didn't reach its thread (${why}). Post them as one comment.`,
        label: count === 1 ? 'Post as a comment' : 'Post as one comment',
      };
    }
    case 'one-comment-org':
      return {
        tone: 'red',
        pill,
        move: `Your ${count} replies didn't reach GitHub: ${orgWords}. Post them as one comment.`,
        label: 'Post as one comment',
      };
    case 'one-comment':
      return {
        tone: 'red',
        pill,
        move: `Your ${count} replies didn't reach their threads. Post them as one comment.`,
        label: 'Post as one comment',
      };
    case 'as-comment':
    case 'as-comment-org':
      return {
        tone: 'red',
        pill,
        move: `Your reply didn't reach its thread${trouble === 'as-comment-org' ? `: ${orgWords}` : ''}. Post it as a comment.`,
        label: 'Post as a comment',
      };
    case 'retry-several': {
      const said = firstSentenceOf(note);
      return {
        tone: 'red',
        pill,
        move: `Your ${count} replies didn't reach GitHub.${said ? ` ${sentence(said)}` : ''}`,
        label: 'Retry the replies',
      };
    }
    default:
      return {
        tone: 'red',
        pill,
        move: replyFailedMove({ lastError: note ? { note } : null }),
        label: 'Retry the reply',
      };
  }
}

/** The note a lead's words quote: a held-back reply's, else its error's. */
const noteOf = (lead: { case: ReplyCase; drafts: ContributeReplyWaiting[] }) =>
  lead.case === 'held-back' ? lead.drafts[0].heldBack?.note : lead.drafts[0].lastError?.note;

/**
 * The row for a pull request's replies that did not post: the first case any run has leads, with the newest run that
 * has it; the rest (that run's other replies, and other runs') in one closing sentence. Null when none did not post.
 * `org` names the organization (the owner part of the repo's name).
 */
export function replyRowOf(
  drafts: readonly ContributeReplyWaiting[],
  runs: readonly Pick<ContributeAttempt, 'attemptId' | 'round'>[],
  org: string,
): ReplyRowWords | null {
  const unposted = drafts.filter(isUnposted);
  if (!unposted.length) return null;
  const byRun = new Map<string, ContributeReplyWaiting[]>();
  for (const draft of unposted) byRun.set(draft.attemptId, [...(byRun.get(draft.attemptId) ?? []), draft]);
  // The newest run first: by its number when both are known, else by its newest reply.
  const latestAt = (runId: string) => Math.max(...(byRun.get(runId) ?? []).map(({ createdAt }) => timeOf(createdAt)));
  const newer = (a: string, b: string) => {
    const [ra, rb] = [roundOf(runs, a), roundOf(runs, b)];
    return ra !== null && rb !== null ? rb - ra : latestAt(b) - latestAt(a);
  };
  const cases = [...byRun.entries()].map(([runId, list]) => ({ runId, cases: casesOf(list) }));
  for (const kind of ORDER) {
    const having = cases
      .flatMap(({ runId, cases: list }) => list.filter((each) => each.case === kind).map((each) => ({ runId, each })))
      .sort((a, b) => newer(a.runId, b.runId));
    const lead = having[0];
    if (!lead) continue;
    const covered = new Set(lead.each.drafts.map(({ draftId }) => draftId));
    const rest = unposted.filter(({ draftId }) => !covered.has(draftId));
    const words = replyWordsOf({
      trouble: troubleOf(lead.each),
      count: lead.each.drafts.length,
      note: noteOf(lead.each),
      org,
    });
    const closing = closingOf(rest, lead.runId, runs);
    return {
      case: kind,
      runId: lead.runId,
      drafts: lead.each.drafts,
      ...words,
      move: closing ? `${words.move} ${closing}` : words.move,
    };
  }
  return null;
}

/** The replies a row's case leaves: the same run's, and each other run's by its number (the API's `replyRest`). */
export type ReplyRest = { same: number; others: { round: number | null; count: number }[] };

/**
 * The replies the row's case leaves, in one sentence: "1 more reply didn't post for another reason, and 2 from run 1
 * wait too: open the pull request's runs." Null when none is left.
 */
function closingWordsOf(rest: ReplyRest | null | undefined): string | null {
  if (!rest) return null;
  const { same, others } = rest;
  const sameWords = same ? `${same} more ${same === 1 ? 'reply' : 'replies'} didn't post for another reason` : null;
  if (!others.length) return sameWords ? `${sameWords}.` : null;
  const groups = others.map(({ round, count }) => `${count} from ${round ? `run ${round}` : 'another run'}`);
  const total = others.reduce((sum, { count }) => sum + count, 0);
  const otherWords = `${groups.join(' and ')} ${total === 1 ? 'waits' : 'wait'} too: open the pull request's runs.`;
  return sameWords ? `${sameWords}, and ${otherWords}` : otherWords;
}

/** The replies the row's case leaves, from the drafts the page read, in one sentence (`closingWordsOf`). */
export function closingOf(
  rest: readonly ContributeReplyWaiting[],
  runId: string,
  runs: readonly Pick<ContributeAttempt, 'attemptId' | 'round'>[],
): string | null {
  if (!rest.length) return null;
  const others = new Map<string, number>();
  for (const draft of rest) {
    if (draft.attemptId !== runId) others.set(draft.attemptId, (others.get(draft.attemptId) ?? 0) + 1);
  }
  return closingWordsOf({
    same: rest.filter((draft) => draft.attemptId === runId).length,
    others: [...others.entries()].map(([id, count]) => ({ round: roundOf(runs, id), count })),
  });
}
