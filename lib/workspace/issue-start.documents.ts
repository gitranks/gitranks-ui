import { parse } from 'graphql';

import type { IssueStart } from './issue-start';
import type DocumentNode from '@/types/typed-document-node';

/** Start one issue on the hosted agent now: the run it started, the viewer's run already on it, or why not. */
export const StartContributeIssueDocument = parse(
  `mutation StartContributeIssue($issueId: ID!) {
  startContributeIssue(issueId: $issueId) {
    attempt { id repo number state }
    started refusal value
    holder { id repo number }
    until
  }
}`,
) as DocumentNode<{ startContributeIssue: IssueStart }, { issueId: string }>;
