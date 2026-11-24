import type { ContributeIssue, ContributeIssuePage } from '@/lib/workspace/contribute.types';

/**
 * The live feed keys its rows by the issue's node id. A masked row of an API that no longer sends the node id is keyed
 * by its mask id instead, set apart so the status poll never sends it as a node id.
 */
const MASK_KEY = 'mask:';

/** The issue with a key the feed can hold: its node id, else its mask id, marked. */
export function keyedIssueOf(issue: ContributeIssue): ContributeIssue {
  if (issue.issueId || !issue.masked?.id) return issue;
  return { ...issue, issueId: `${MASK_KEY}${issue.masked.id}` };
}

/** A page of the feed with every row keyed. */
export function keyedPageOf<T extends ContributeIssuePage | null | undefined>(page: T): T {
  return page ? ({ ...page, items: page.items.map(keyedIssueOf) } as T) : page;
}

/** The keys the status poll can ask about: node ids only. */
export const nodeIdsOf = (keys: readonly string[]): string[] => keys.filter((key) => !key.startsWith(MASK_KEY));
