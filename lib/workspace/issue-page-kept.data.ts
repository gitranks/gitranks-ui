import 'server-only';

import { parse } from 'graphql';

import { viewerLogin } from './contribute.data';
import { type IssueKeptForLearners, issueKeptOf } from './issue-page-kept';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { RequestSource } from '@/lib/signed-fetch';
import type DocumentNode from '@/types/typed-document-node';

/** How long the page waits for the read: a slower answer draws the page without it, as a failed one does. */
export const ISSUE_PAGE_KEPT_TIMEOUT_MS = 3_000;

/**
 * Whether the issue is kept for learners from the viewer now, in an operation of its own beside the page's read: an
 * API that does not answer the field fails this read alone. Personal, read per request.
 */
export const IssuePageKeptDocument = parse(
  `query IssuePageKept($id: ID!) {
  issuePage(id: $id) {
    keptForLearners { until }
  }
}`,
) as DocumentNode<{ issuePage: unknown }, { id: string }>;

/**
 * Whether the issue is kept for learners from the viewer, by its mask id: from the page's render (`ssr`), or again
 * after a press Contribute refused (`client`). Null when it is not, signed out, for an id no issue has, and whenever
 * the read fails, is slow or answers what the page cannot draw: the page then draws what it draws without it.
 */
export async function loadIssuePageKept(
  id: string,
  source: Extract<RequestSource, 'ssr' | 'client'> = 'ssr',
): Promise<IssueKeptForLearners | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { issuePage } = await graphqlDirect(
      IssuePageKeptDocument,
      { id },
      { source, githubLogin, signal: AbortSignal.timeout(ISSUE_PAGE_KEPT_TIMEOUT_MS) },
    );
    return issueKeptOf(issuePage);
  } catch {
    return null;
  }
}
