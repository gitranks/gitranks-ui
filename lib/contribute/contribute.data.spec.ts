import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin,
  settled: <T>(result: PromiseSettledResult<T>) => (result.status === 'fulfilled' ? result.value : undefined),
}));

const { loadContributeTab } = await import('./contribute.data');
const { ContributeTabStateDocument, ContributeTabTotalsDocument } = await import('./contribute-tab.documents');

const FIX = { open: 2, merged: 7, closed: 4, reposHelped: 6 };
const answer = (totals: () => Promise<unknown>, state: () => Promise<unknown>) =>
  graphqlDirect.mockImplementation(async (document) =>
    document === ContributeTabTotalsDocument ? totals() : document === ContributeTabStateDocument ? state() : null,
  );
const fails = () => Promise.reject(new Error('down'));

describe("the Contribute tab's own reads", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    viewerLogin.mockResolvedValue('octocat');
  });

  it("reads Contribute's totals, who paused and the hosted agent's level, as the viewer", async () => {
    answer(
      async () => ({ contributeContributions: { totals: { byMode: { fix: FIX } } } }),
      async () => ({ contribute: { contributor: { pausedByYou: true, settings: { hostedLevel: 'NEXT' } } } }),
    );
    expect(await loadContributeTab()).toEqual({ totals: FIX, pausedByYou: true, hostedLevel: 'NEXT' });
    expect(graphqlDirect.mock.calls.every(([, , options]) => options.githubLogin === 'octocat')).toBe(true);
  });

  it('reads nothing without a session', async () => {
    viewerLogin.mockResolvedValueOnce(null);
    expect(await loadContributeTab()).toEqual({ totals: null, pausedByYou: false, hostedLevel: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('keeps who paused when the totals fail, and the totals when the rest fails', async () => {
    answer(fails, async () => ({ contribute: { contributor: { pausedByYou: true, settings: null } } }));
    expect(await loadContributeTab()).toEqual({ totals: null, pausedByYou: true, hostedLevel: null });
    answer(async () => ({ contributeContributions: { totals: { byMode: { fix: FIX } } } }), fails);
    expect(await loadContributeTab()).toEqual({ totals: FIX, pausedByYou: false, hostedLevel: null });
  });

  it('reads an unanswered pause as not paused, and an API without the sides as no totals', async () => {
    answer(
      async () => ({ contributeContributions: { totals: { byMode: null } } }),
      async () => ({ contribute: { contributor: { pausedByYou: null, settings: { hostedLevel: null } } } }),
    );
    expect(await loadContributeTab()).toEqual({ totals: null, pausedByYou: false, hostedLevel: null });
  });
});
