import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  viewerLogin: vi.fn(),
  loadContribute: vi.fn(),
  loadContributeSetup: vi.fn(),
  loadIssueAttempt: vi.fn(),
  loadAttempt: vi.fn(),
  loadRepliesWaiting: vi.fn(),
  loadPrNotes: vi.fn(),
}));
const prData = vi.hoisted(() => ({
  loadPullRequestPage: vi.fn(),
  loadTimelineHideable: vi.fn(),
  loadBlockedWalkthroughs: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
vi.mock('@/lib/workspace/pull-request.data', async (original) => ({
  ...(await original<typeof import('@/lib/workspace/pull-request.data')>()),
  ...prData,
}));
vi.mock('./page-view', () => ({ PullRequestPageView: () => null }));
vi.mock('./proof-section', () => ({ ProofSection: () => null }));
vi.mock('@/components/workspace/workspace-sign-in', () => ({ WorkspaceSignIn: () => null }));

const { PullRequestPageScreen } = await import('./page-screen');
const { PullRequestPageView } = await import('./page-view');
const { WorkspaceSignIn } = await import('@/components/workspace/workspace-sign-in');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { prPage } = await import('@/lib/workspace/__fixtures__/pull-request');

type ViewProps = {
  page: { box: string };
  walkthroughBlocked: { reason: string | null } | null;
  ops: { walkthroughSendBack: boolean; attemptId: string };
};

const open = (params: Record<string, string> = {}, query: Record<string, string> = {}) =>
  PullRequestPageScreen({
    params: Promise.resolve({ owner: 'acme', repo: 'widgets', issue: '42', ...params }),
    searchParams: Promise.resolve(query),
  }) as Promise<ReactElement<ViewProps> | null>;

const FIRST = detail({ attemptId: 'A_1', kind: 'FIRST', mode: 'LEARN', nameWithOwner: 'acme/widgets', number: 42 });

beforeEach(() => {
  for (const mock of [...Object.values(data), ...Object.values(prData)]) mock.mockReset();
  data.viewerLogin.mockResolvedValue('octocat');
  data.loadContribute.mockResolvedValue(views.active);
  data.loadIssueAttempt.mockResolvedValue({ attemptId: 'A_1', repo: 'acme/widgets', number: 42, earlier: [] });
  data.loadAttempt.mockResolvedValue(FIRST);
  prData.loadPullRequestPage.mockResolvedValue(prPage({ attemptId: 'A_1', repo: 'acme/widgets', issueNumber: 42 }));
  prData.loadTimelineHideable.mockResolvedValue(false);
  prData.loadBlockedWalkthroughs.mockResolvedValue(null);
});

describe("the pull request's page, by its address", () => {
  it('asks a visitor without a session to sign in, the link their agent handed them', async () => {
    data.viewerLogin.mockResolvedValue(null);
    const page = await open();
    expect(page?.type).toBe(WorkspaceSignIn);
    expect(data.loadIssueAttempt).not.toHaveBeenCalled();
  });

  it('sends a user not onboarded to the landing', async () => {
    data.loadContribute.mockResolvedValue(views.midSetup);
    await expect(open()).rejects.toThrow('NEXT_REDIRECT /contribute');
  });

  it("is a 404 for an issue that is not the person's, and says so when the API does not answer", async () => {
    data.loadIssueAttempt.mockResolvedValue(null);
    await expect(open()).rejects.toThrow('NEXT_NOT_FOUND');
    data.loadIssueAttempt.mockResolvedValue({ attemptId: 'A_1', repo: 'acme/widgets', number: 42, earlier: [] });
    prData.loadPullRequestPage.mockResolvedValue(undefined);
    expect((await open())?.type).not.toBe(PullRequestPageView);
  });

  it('moves a renamed repository to its current address, with the query it came with', async () => {
    data.loadIssueAttempt.mockResolvedValue({ attemptId: 'A_1', repo: 'acme/gadgets', number: 42, earlier: [] });
    await expect(open({}, { session: 'next' })).rejects.toThrow(
      'NEXT_REDIRECT /my/pull-requests/acme/gadgets/42?session=next',
    );
  });

  it('draws the page from its read', async () => {
    const page = await open();
    expect(page?.type).toBe(PullRequestPageView);
    expect(page?.props.walkthroughBlocked).toBeNull();
    // Not a walkthrough that waits: the stopped walkthroughs are not read.
    prData.loadPullRequestPage.mockResolvedValue(prPage({ box: 'APPROVE' }));
    await open();
    expect(prData.loadBlockedWalkthroughs).toHaveBeenCalledTimes(1);
  });

  it('says a walkthrough that waits for another pass, with the send-back to the fix itself', async () => {
    prData.loadBlockedWalkthroughs.mockResolvedValue(new Map([['A_1', { reason: 'A question is unclear.' }]]));
    data.loadAttempt.mockResolvedValue({ ...FIRST, sendBacksLeft: 2 });
    const page = await open();
    expect(page?.props.walkthroughBlocked).toEqual({ reason: 'A question is unclear.' });
    expect(page?.props.ops).toMatchObject({ attemptId: 'A_1', walkthroughSendBack: true });
    // No send-back left: the box keeps its words, without the button.
    data.loadAttempt.mockResolvedValue({ ...FIRST, sendBacksLeft: 0 });
    expect((await open())?.props.ops.walkthroughSendBack).toBe(false);
    // The read failed: the page as its own read says.
    prData.loadBlockedWalkthroughs.mockResolvedValue(null);
    expect((await open())?.props.walkthroughBlocked).toBeNull();
  });
});
