import 'server-only';

import { type BlockedWalkthroughs, blockedWalkthroughsOf } from './blocked-walkthrough';
import { viewerLogin } from './contribute.data';
import {
  AttemptTimelineHideableDocument,
  BlockedWalkthroughReasonsDocument,
  NeedsYouKindsDocument,
  PullRequestApprovalDocument,
  PullRequestListDocument,
  PullRequestPageDocument,
  type PullRequestRefInput,
} from './pull-request.documents';
import type { PullRequestApproval, PullRequestList, PullRequestPage } from './pull-request-page.types';
import { pullRequestApprovalOf, pullRequestListOf, pullRequestPageOf } from './pull-request-read';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The person's own reads of a pull request's page, Approve and their list: never kept, each asked as the session's
 * user. Each answers `undefined` when the API did not answer (an older API without the read, a failure), which the page
 * says as "did not load", and null when the API says there is nothing of the person's to show.
 */

/** A fix of the person's by its issue and first attempt, as the API takes it. */
export function pullRequestRefOf(repo: string, issue: number, attempt: string | null): PullRequestRefInput {
  const [owner = '', name = ''] = repo.split('/');
  return { owner, repo: name, issue, attempt };
}

const as = async () => {
  const githubLogin = await viewerLogin();
  return githubLogin ? { source: 'ssr' as const, githubLogin } : null;
};

/** The page of one fix of the person's; null when it is not theirs. */
export async function loadPullRequestPage(ref: PullRequestRefInput): Promise<PullRequestPage | null | undefined> {
  const options = await as();
  if (!options) return undefined;
  try {
    const { pullRequestPage } = await graphqlDirect(PullRequestPageDocument, { ref }, options);
    if (pullRequestPage === null || pullRequestPage === undefined) return null;
    return pullRequestPageOf(pullRequestPage) ?? undefined;
  } catch {
    return undefined;
  }
}

/** What Approve needs; null when the fix is not theirs or does not wait for its approval. */
export async function loadPullRequestApproval(
  ref: PullRequestRefInput,
): Promise<PullRequestApproval | null | undefined> {
  const options = await as();
  if (!options) return undefined;
  try {
    const { pullRequestApproval } = await graphqlDirect(PullRequestApprovalDocument, { ref }, options);
    if (pullRequestApproval === null || pullRequestApproval === undefined) return null;
    return pullRequestApprovalOf(pullRequestApproval) ?? undefined;
  } catch {
    return undefined;
  }
}

/** The person's pull requests, or 20 more of "Ended" after a cursor. */
export async function loadPullRequestList(after: string | null = null): Promise<PullRequestList | undefined> {
  const options = await as();
  if (!options) return undefined;
  try {
    const { pullRequestList } = await graphqlDirect(PullRequestListDocument, { after }, options);
    return pullRequestListOf(pullRequestList) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether the person can still hide the public page of a fix: only when its approval carried that choice and the page
 * is shown. False on any failure, and against an API that does not say: the link is then left out.
 */
export async function loadTimelineHideable(attemptId: string): Promise<boolean> {
  const options = await as();
  if (!options) return false;
  try {
    const { contributeAttempt } = await graphqlDirect(AttemptTimelineHideableDocument, { id: attemptId }, options);
    const timeline = (contributeAttempt as { timeline?: { shown?: unknown; hideable?: unknown } | null } | null)
      ?.timeline;
    return timeline?.hideable === true && timeline.shown === true;
  } catch {
    return false;
  }
}

/** How long the stopped walkthroughs' reads may take: past it, the list and the page are drawn without them. */
const BLOCKED_READ_MS = 2500;

/**
 * The person's walkthroughs that wait for another pass by their agent, by the fix's first attempt, each with its
 * reason when that read answers too. Two reads of their own, each with a time limit: null when the first fails (the
 * rows and the page stay as their own reads say), no reason when the second does.
 */
export async function loadBlockedWalkthroughs(): Promise<BlockedWalkthroughs | null> {
  const options = await as();
  if (!options) return null;
  const read = (document: typeof NeedsYouKindsDocument) =>
    graphqlDirect(document, undefined, { ...options, signal: AbortSignal.timeout(BLOCKED_READ_MS) }).then(
      (data) => data.contributeNeedsYou ?? null,
      () => undefined,
    );
  const [kinds, reasons] = await Promise.all([read(NeedsYouKindsDocument), read(BlockedWalkthroughReasonsDocument)]);
  return kinds === undefined ? null : blockedWalkthroughsOf(kinds, reasons ?? null);
}
