import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  loadContributeSetup: vi.fn(),
  loadContributeSetupState: vi.fn(async () => 'none'),
}));
const prData = vi.hoisted(() => ({ loadPullRequestList: vi.fn(), loadBlockedWalkthroughs: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
vi.mock('@/lib/workspace/pull-request.data', () => prData);
vi.mock('./list-view', () => ({ PullRequestListPageView: () => null }));

const { PullRequestListPage } = await import('./list-page');
const { PullRequestListPageView } = await import('./list-view');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { prList, prRow } = await import('@/lib/workspace/__fixtures__/pull-request');

type Props = { list: ReturnType<typeof prList>; side: string; issuesHref: string };
/** A person with neither sign, a token waiting for its agent. */
const NO_SIGN = {
  ...views.midSetup,
  contributor: { ...views.midSetup.contributor, contributeOnboardedAt: null, learnOnboardedAt: null },
};

const open = (query: Record<string, string> = {}) =>
  PullRequestListPage({ searchParams: Promise.resolve(query) }) as Promise<ReactElement<Props>>;

beforeEach(() => {
  data.loadContribute.mockReset().mockResolvedValue(views.active);
  prData.loadPullRequestList
    .mockReset()
    .mockResolvedValue(
      prList({ rows: [prRow('WALKTHROUGH', { attemptId: 'A_1' }), prRow('OPEN', { attemptId: 'A_2' })] }),
    );
  prData.loadBlockedWalkthroughs.mockReset().mockResolvedValue(null);
});

describe('the Pull requests tab', () => {
  it('leads the empty page to the issues of the product the person came from, Learn to its home', async () => {
    expect((await open({ from: 'learn' })).props.issuesHref).toBe('/learn');
    expect((await open({ from: 'contribute' })).props.issuesHref).toBe('/contribute#issues');
  });

  it('marks a walkthrough that waits for another pass on its row, and the rows as they are without that read', async () => {
    prData.loadBlockedWalkthroughs.mockResolvedValue(new Map([['A_1', { reason: null }]]));
    const marked = await open();
    expect(marked.type).toBe(PullRequestListPageView);
    expect(marked.props.list.rows.map((row) => row.walkthroughBlocked ?? null)).toEqual([{ reason: null }, null]);
    prData.loadBlockedWalkthroughs.mockResolvedValue(null);
    expect((await open()).props.list.rows.every((row) => row.walkthroughBlocked === undefined)).toBe(true);
  });

  it('asks whether a walkthrough waits for another pass only when a Learn fix is on its walkthrough', async () => {
    prData.loadPullRequestList.mockResolvedValue(
      prList({ rows: [prRow('OPEN', { attemptId: 'A_2' }), prRow('WALKTHROUGH', { made: 'CONTRIBUTE' })] }),
    );
    await open();
    expect(prData.loadBlockedWalkthroughs).not.toHaveBeenCalled();
    prData.loadPullRequestList.mockResolvedValue(prList({ rows: [prRow('WALKTHROUGH', { attemptId: 'A_1' })] }));
    await open();
    expect(prData.loadBlockedWalkthroughs).toHaveBeenCalledOnce();
  });

  it('says so when the list does not load', async () => {
    prData.loadPullRequestList.mockResolvedValue(undefined);
    expect((await open()).type).not.toBe(PullRequestListPageView);
  });

  it.each<[string, string | null | undefined, string | null | undefined]>([
    ['the Contribute sign only', '2026-11-25T09:00:00.000Z', null],
    ['the Learn sign only', null, '2026-11-25T09:00:00.000Z'],
    ['both signs', '2026-11-25T09:00:00.000Z', '2026-11-25T09:00:00.000Z'],
    ['the signs not known', undefined, undefined],
  ])('opens with %s: Learn fixes have pull requests too', async (_who, contributeOnboardedAt, learnOnboardedAt) => {
    data.loadContribute.mockResolvedValue({
      ...views.midSetup,
      contributor: { ...views.midSetup.contributor, contributeOnboardedAt, learnOnboardedAt },
    });
    expect((await open()).type).toBe(PullRequestListPageView);
  });

  it("sends a person with neither sign to /contribute, or to Learn's onboarding with the way back when Learn opened it", async () => {
    data.loadContribute.mockResolvedValue(NO_SIGN);
    await expect(open()).rejects.toThrow(/NEXT_REDIRECT \/contribute$/);
    await expect(open({ from: 'learn' })).rejects.toThrow(
      `NEXT_REDIRECT /learn/setup?back=${encodeURIComponent('/my/pull-requests?from=learn')}`,
    );
  });
});
