import type { Route } from 'next';

import type { ContributeActionResult } from './errors';
import type { IssueStart } from './issue-start';
import { pullRequestPath } from './paths';
import {
  ISSUE_START_FAILED,
  type IssueStartFacts,
  type IssueStartRefusalCopy,
  issueStartRefusalOf,
} from './start-refusals';

/** What a row's hosted Start comes to: its run's pull request page, or why it did not start. */
export type HostedStartOutcome = { kind: 'open'; href: Route } | { kind: 'refused'; refusal: IssueStartRefusalCopy };

/**
 * The outcome of a hosted Start of the issue `ref`. A run (the one started, or the viewer's own already on it) opens
 * its pull request's page; a refusal is worded. A failed or timed-out call is never trusted: the start may have
 * happened, its answer lost, so the viewer's attempt on the issue is read once (`readAttempt`), and a live one opens
 * like a success; only with none does the row say something went wrong.
 */
export async function hostedStartOutcomeOf(
  result: ContributeActionResult<IssueStart> | null,
  ref: { repo: string; issue: number },
  readAttempt: () => Promise<ContributeActionResult<{ id: string } | null> | null>,
  facts: IssueStartFacts = {},
): Promise<HostedStartOutcome> {
  if (result?.ok) {
    const refusal = issueStartRefusalOf(result.data, facts);
    if (refusal) return { kind: 'refused', refusal };
    const { attempt } = result.data;
    if (attempt) return { kind: 'open', href: pullRequestPath({ repo: attempt.repo, issue: attempt.number }) };
  }
  const found = await readAttempt().catch(() => null);
  if (found?.ok && found.data) return { kind: 'open', href: pullRequestPath(ref) };
  return { kind: 'refused', refusal: ISSUE_START_FAILED };
}
