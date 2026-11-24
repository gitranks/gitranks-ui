'use server';

import type { IssueKeptForLearners } from './issue-page-kept';
import { loadIssuePageKept } from './issue-page-kept.data';
import { maskIdOf } from './masked-issue';

/**
 * Whether the issue is kept for learners from the session's user, read again after a press Contribute refused: the page
 * then says so in place of its plain end. Null when it is not, or cannot be read.
 */
export async function readIssueKept(id: string): Promise<IssueKeptForLearners | null> {
  const maskId = maskIdOf(id);
  if (!maskId) return null;
  return loadIssuePageKept(maskId, 'client');
}
