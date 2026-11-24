import 'server-only';

import { parse } from 'graphql';

import { viewerLogin } from './contribute.data';
import { type IssuePageLearn, issuePageLearnOf } from './issue-page-learn';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/**
 * Learn's parts of the page of one issue, in an operation of their own beside the page's read: the lesson and why,
 * whether it is kept for learners, and how the work started. Personal, read per request.
 */
export const IssuePageLearnDocument = parse(
  `query IssuePageLearn($id: ID!) {
  issuePage(id: $id) {
    lesson { slug title }
    why
    learnOnly
    started { agent at walkthrough }
  }
}`,
) as DocumentNode<{ issuePage: unknown }, { id: string }>;

/**
 * Learn's parts for the viewer, by the issue's mask id. Null signed out, for an id no issue has, and whenever the read
 * fails or answers what the page cannot draw: the page then draws what it draws without them.
 */
export async function loadIssuePageLearn(id: string): Promise<IssuePageLearn | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { issuePage } = await graphqlDirect(IssuePageLearnDocument, { id }, { source: 'ssr', githubLogin });
    return issuePageLearnOf(issuePage);
  } catch {
    return null;
  }
}
