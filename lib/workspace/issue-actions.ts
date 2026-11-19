'use server';

import { run } from './action-run';
import { SkipIssueDocument } from './contribute.documents';
import type { ContributeActionResult } from './errors';
import type { IssueStart } from './issue-start';
import { StartContributeIssueDocument } from './issue-start.documents';

/** What an issue row does: skip the issue for good, or start it on the hosted agent now. */

export async function skipIssue(issueId: string): Promise<ContributeActionResult<boolean>> {
  return run(SkipIssueDocument, { issueId: String(issueId) }, (data) => data.skipIssue);
}

/** Starts the issue on the hosted agent, as the session's user. The API waits up to 30 seconds for the start. */
export async function startIssue(issueId: string): Promise<ContributeActionResult<IssueStart>> {
  if (typeof issueId !== 'string' || !issueId) return { ok: false, error: 'INVALID' };
  return run(StartContributeIssueDocument, { issueId }, (data) => data.startContributeIssue);
}
