'use server';

import { type IssueKeptRead, readIssuePageKept } from './issue-page-kept.data';
import { maskIdOf } from './masked-issue';

/**
 * Whether the issue is kept for learners from the session's user, read again after a press Contribute refused: the page
 * then says so in place of its plain end, or stops saying it. `{ kept: null }`: not kept. Null: it could not be read,
 * so the page keeps what it showed.
 */
export async function readIssueKept(id: string): Promise<IssueKeptRead | null> {
  const maskId = maskIdOf(id);
  if (!maskId) return null;
  return readIssuePageKept(maskId, 'client');
}
