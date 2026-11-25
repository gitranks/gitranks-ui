import 'server-only';

import { type BlockedWalkthroughs, blockedWalkthroughsOf } from './blocked-walkthrough';
import { viewerLogin } from './contribute.data';
import {
  AttemptTimelineHideableDocument,
  BlockedWalkthroughReasonsDocument,
  NeedsYouKindsDocument,
  PullRequestApprovalDocument,
  PullRequestListDocument,
  PullRequestListMergedDocument,
  PullRequestPageDocument,
  type PullRequestRefInput,
} from './pull-request.documents';
import type {
  PullRequestApproval,
  PullRequestList,
  PullRequestListWithMerged,
  PullRequestPage,
} from './pull-request-page.types';
import { pullRequestApprovalOf, pullRequestListOf, pullRequestPageOf, pullRequestsMergedOf } from './pull-request-read';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The person's own reads of a pull request's page, Approve and their list: never kept, each asked as the session's
 * user. Each answers `undefined` when the API did not answer (an older API without the read, a failure, or no answer
 * within its time limit), which the page says as "did not load", and null when the API says there is nothing of the
 * person's to show. A slow answer never holds the page.
 */

/** How long a page's own read may take: past it, the page says it did not load. */
const PAGE_READ_MS = 8000;
/** How long a read that only adds to the page may take: past it, the page is drawn without it. */
const PART_READ_MS = 2500;

/** A fix of the person's by its issue and first attempt, as the API takes it. */
export function pullRequestRefOf(repo: string, issue: number, attempt: string | null): PullRequestRefInput {
  const [owner = '', name = ''] = repo.split('/');
  return { owner, repo: name, issue, attempt };
}

const as = async (limitMs = PAGE_READ_MS) => {
  const githubLogin = await viewerLogin();
  return githubLogin ? { source: 'ssr' as const, githubLogin, signal: AbortSignal.timeout(limitMs) } : null;
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
 * The first page of the person's list with their newest merged pull request, for Contribute home, in one read. Only
 * when that read fails (an API without `merged`), the plain list, with `merged` null: the list's boxes still show and
 * the "Merged" box says it could not read. `undefined` when neither answers.
 */
export async function loadPullRequestListWithMerged(): Promise<PullRequestListWithMerged | undefined> {
  const options = await as();
  if (!options) return undefined;
  try {
    const { pullRequestList } = await graphqlDirect(PullRequestListMergedDocument, undefined, options);
    const list = pullRequestListOf(pullRequestList);
    if (list) return { ...list, merged: pullRequestsMergedOf((pullRequestList as { merged?: unknown }).merged) };
  } catch {
    // An API without `merged`: the plain list below.
  }
  const list = await loadPullRequestList();
  return list && { ...list, merged: null };
}

/**
 * The public page of a fix the person may hide or show again: only when its approval carried that choice, with whether
 * it shows now. Null on any failure, past its time limit, and against an API that does not say: the line is then left
 * out.
 */
export async function loadTimelineSwitch(attemptId: string): Promise<{ shown: boolean } | null> {
  const options = await as(PART_READ_MS);
  if (!options) return null;
  try {
    const { contributeAttempt } = await graphqlDirect(AttemptTimelineHideableDocument, { id: attemptId }, options);
    const timeline = (
      contributeAttempt as { timeline?: { eligible?: unknown; shown?: unknown; hideable?: unknown } | null } | null
    )?.timeline;
    if (timeline?.eligible !== true || timeline.hideable !== true) return null;
    return { shown: timeline.shown === true };
  } catch {
    return null;
  }
}

/**
 * The person's walkthroughs that wait for another pass by their agent, by the fix's first attempt, each with its
 * reason. One read with the reasons; only when it fails (an API without them), the same read without them, so the
 * title and the button still show. Each has its own time limit; null when neither answers (the rows and the page stay
 * as their own reads say).
 */
export async function loadBlockedWalkthroughs(): Promise<BlockedWalkthroughs | null> {
  const read = async (document: typeof NeedsYouKindsDocument) => {
    const options = await as(PART_READ_MS);
    if (!options) return undefined;
    return graphqlDirect(document, undefined, options).then(
      (data) => data.contributeNeedsYou ?? null,
      () => undefined,
    );
  };
  const withReasons = await read(BlockedWalkthroughReasonsDocument);
  if (withReasons !== undefined) return blockedWalkthroughsOf(withReasons, withReasons);
  const kinds = await read(NeedsYouKindsDocument);
  return kinds === undefined ? null : blockedWalkthroughsOf(kinds);
}
