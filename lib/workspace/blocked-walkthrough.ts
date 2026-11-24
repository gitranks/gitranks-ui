import type { PullRequestList, PullRequestListRow } from './pull-request-page.types';

/**
 * A walkthrough of an older version that the person's reports stopped: its questions need another pass by their agent.
 * The list and the pull request's page read it apart from their own reads, so it never reads as ready to take.
 */

/** A stopped walkthrough, by its fix's first attempt: the check's one-line reason, when it gave one we know. */
export type BlockedWalkthroughs = ReadonlyMap<string, { reason: string | null }>;

export const BLOCKED_WALKTHROUGH_WORDS = {
  line: 'The fix walkthrough needs another pass',
  /** The pull request's page, when the fix can go back to the person's agent. */
  text: 'Send it back to your agent, and it writes the questions again.',
  button: 'Send it back to your agent',
  /** The pull request's page, when no send-back is left. */
  noneLeftText:
    'No send-backs are left for this fix, so its questions can’t be written again. You can discard it below.',
  /** The pull request's page, when the fix can't go back to the person's own agent. */
  noSendBackText: 'It can’t go back to your agent from here. You can discard it below.',
  /** A row, and Learn home's box: they can't tell whether a send-back is left, so the fix's page says. */
  rowButton: 'See what to do',
  homeText: 'Open your fix to see what you can do.',
} as const;

/** Whether a stopped walkthrough can go back to the person's agent: yes, no send-back left, or not from here. */
export type WalkthroughSendBack = 'yes' | 'none-left' | 'no';

/** What the person reported, in one line; null for a reason this page does not know. */
const REASON_LINES: Record<string, string> = {
  wrong_key: 'A question’s marked answer is wrong.',
  unclear: 'A question is unclear.',
  off_topic: 'A question is not about this fix.',
  two_fit: 'More than one answer fits a question.',
};

export const blockedReasonLineOf = (reason: unknown): string | null =>
  typeof reason === 'string' ? (REASON_LINES[reason.trim().toLowerCase()] ?? null) : null;

/** The kind of the API's item for a stopped walkthrough, in any spelling the API gives (`LESSON_BLOCKED`). */
const isBlockedKind = (kind: unknown) =>
  typeof kind === 'string' && kind.trim().toLowerCase().replace(/_/g, '-') === 'lesson-blocked';

const itemsOf = (answer: unknown): Record<string, unknown>[] => {
  const items = (answer as { items?: unknown } | null | undefined)?.items;
  return Array.isArray(items)
    ? items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
};

/**
 * The stopped walkthroughs from the "needs you" items (kind and attempt alone), with the reasons from their own read
 * when it answered (null otherwise: no line).
 */
export function blockedWalkthroughsOf(items: unknown, reasons: unknown = null): BlockedWalkthroughs {
  const reasonOf = new Map<string, string | null>();
  for (const item of itemsOf(reasons)) {
    const facts = item.facts as { blockedReason?: unknown } | null | undefined;
    if (typeof item.attemptId === 'string') reasonOf.set(item.attemptId, blockedReasonLineOf(facts?.blockedReason));
  }
  const blocked = new Map<string, { reason: string | null }>();
  for (const item of itemsOf(items)) {
    if (!isBlockedKind(item.kind) || typeof item.attemptId !== 'string' || !item.attemptId) continue;
    blocked.set(item.attemptId, { reason: reasonOf.get(item.attemptId) ?? null });
  }
  return blocked;
}

/** A row marked when its walkthrough is stopped, by its first attempt; as it is otherwise or without the read. */
export function withBlockedWalkthrough(
  row: PullRequestListRow,
  blocked: BlockedWalkthroughs | null,
): PullRequestListRow {
  const found = row.box === 'WALKTHROUGH' ? blocked?.get(row.attemptId) : undefined;
  return found ? { ...row, walkthroughBlocked: found } : row;
}

/** The list with its stopped walkthroughs marked; as it is without the read. */
export function withBlockedWalkthroughs(list: PullRequestList, blocked: BlockedWalkthroughs | null): PullRequestList {
  if (!blocked?.size) return list;
  return { ...list, rows: list.rows.map((row) => withBlockedWalkthrough(row, blocked)) };
}
