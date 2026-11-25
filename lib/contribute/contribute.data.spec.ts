import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin,
}));

const { loadContributeTab } = await import('./contribute.data');
const { ContributeTabTotalsDocument } = await import('./contribute-tab.documents');

const answer = (totals: unknown) => graphqlDirect.mockImplementation(async () => totals);

describe("Contribute home's totals", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    viewerLogin.mockResolvedValue('octocat');
  });

  it('reads the merged pull requests and the projects helped of both products, as the viewer', async () => {
    answer({ contributeContributions: { totals: { merged: 7, reposHelped: 6 } } });
    expect(await loadContributeTab()).toEqual({ merged: 7, reposHelped: 6 });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    const [document, , options] = graphqlDirect.mock.calls[0];
    expect(document).toBe(ContributeTabTotalsDocument);
    expect(options.githubLogin).toBe('octocat');
  });

  it('asks for the top-level totals alone, not one side of them', () => {
    const source = ContributeTabTotalsDocument.loc?.source.body ?? '';
    expect(source).toContain('totals { merged reposHelped }');
    expect(source).not.toContain('byMode');
  });

  it('reads nothing without a session', async () => {
    viewerLogin.mockResolvedValueOnce(null);
    expect(await loadContributeTab()).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers null on a failed read or totals without numbers, so the box says it could not read', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadContributeTab()).toBeNull();
    answer({ contributeContributions: null });
    expect(await loadContributeTab()).toBeNull();
    answer({ contributeContributions: { totals: { merged: 2 } } });
    expect(await loadContributeTab()).toBeNull();
  });

  it('reads none merged as a count, not a failure', async () => {
    answer({ contributeContributions: { totals: { merged: 0, reposHelped: 0 } } });
    expect(await loadContributeTab()).toEqual({ merged: 0, reposHelped: 0 });
  });
});
