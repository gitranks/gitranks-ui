import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { loadFlowProfileLanguages } = await import('./start-flow.data');

describe('the profile’s languages for What you work on', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    viewerLogin.mockResolvedValue('octocat');
  });

  it('reads them for the signed-in viewer, dropping a name the pool does not know', async () => {
    graphqlDirect.mockResolvedValue({ contributeProfileLanguages: ['GO', 'COBOL', 'JS_TS'] });
    expect(await loadFlowProfileLanguages()).toEqual(['GO', 'JS_TS']);
    expect(graphqlDirect).toHaveBeenCalledWith(expect.anything(), undefined, { source: 'ssr', githubLogin: 'octocat' });
  });

  it('pre-ticks nothing when the read fails (an API without the field) or answers null', async () => {
    graphqlDirect.mockRejectedValue(new Error('Cannot query field "contributeProfileLanguages"'));
    expect(await loadFlowProfileLanguages()).toEqual([]);
    graphqlDirect.mockResolvedValue({ contributeProfileLanguages: null });
    expect(await loadFlowProfileLanguages()).toEqual([]);
  });

  it('asks nothing signed out', async () => {
    viewerLogin.mockResolvedValue(null);
    expect(await loadFlowProfileLanguages()).toEqual([]);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
