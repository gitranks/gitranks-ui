import type {
  ContributeIssue,
  ContributeIssueAnswer,
  ContributeIssuePage,
  ContributeIssuePageAnswer,
} from '@/lib/workspace/contribute.types';
import { isMaskKey, maskKeyOf } from '@/lib/workspace/masked-answer';

/**
 * The issue as the feed holds it. A masked one is keyed by its mask id, set apart so the status poll never sends it as
 * a node id, and keeps nothing that names its issue, whatever the API sent: no node ids, project, number, link, title,
 * labels, reason or repo rules.
 */
export function keyedIssueOf(issue: ContributeIssueAnswer): ContributeIssue {
  if (!issue.masked?.id) return issue as ContributeIssue;
  return {
    ...issue,
    issueId: maskKeyOf(issue.masked.id),
    repositoryId: '',
    nameWithOwner: '',
    number: 0,
    url: '',
    title: null,
    labels: [],
    why: '',
    repoRules: null,
  };
}

/** A page of the feed with every row keyed, and its masked rows stripped. */
export function keyedPageOf(page: ContributeIssuePageAnswer | null | undefined): ContributeIssuePage | null {
  return page ? { ...page, items: page.items.map(keyedIssueOf) } : null;
}

/** The keys the status poll can ask about: node ids only. */
export const nodeIdsOf = (keys: readonly string[]): string[] => keys.filter((key) => !isMaskKey(key));
