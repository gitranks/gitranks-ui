import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./contribute.data', () => ({ viewerLogin }));

const { loadRuns } = await import('./runs.data');

beforeEach(() => {
  graphqlDirect.mockReset().mockResolvedValue({ contributeRuns: null });
  viewerLogin.mockReset().mockResolvedValue('octocat');
});

const variablesOf = () => graphqlDirect.mock.calls[0][1];

describe('loadRuns', () => {
  it('asks a numbered page by the runs it skips, 20 a page, and no offset on the first', async () => {
    await loadRuns({ outcome: 'NO_GO' }, { page: 3 });
    expect(variablesOf()).toEqual({ filter: { outcome: 'NO_GO' }, first: 20, offset: 40 });
    graphqlDirect.mockClear();
    await loadRuns({});
    expect(variablesOf()).toEqual({ filter: {}, first: 20 });
  });

  it("asks the Agent tab's preview for its few runs", async () => {
    await loadRuns({}, { size: 5 });
    expect(variablesOf()).toEqual({ filter: {}, first: 5 });
  });

  it('answers undefined signed out, and when the API fails', async () => {
    viewerLogin.mockResolvedValueOnce(null);
    expect(await loadRuns({})).toBeUndefined();
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadRuns({})).toBeUndefined();
  });
});
