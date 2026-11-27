import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect, token, everyone } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  token: { current: null as { githubLogin?: string; error?: string } | null },
  everyone: vi.fn(async (_now: number) => false),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf: async () => token.current }));
vi.mock('./build-everyone', () => ({ buildOpenToEveryone: everyone }));

const { BUILD_OPEN_TIMEOUT_MS, buildGateOf, buildOpenFor } = await import('./build-gate');

const request = { headers: new Headers() };

describe("Build's gate", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    everyone.mockReset();
    everyone.mockResolvedValue(false);
    token.current = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is open to everyone without asking about the person', async () => {
    everyone.mockResolvedValue(true);
    token.current = { githubLogin: 'octocat' };
    expect(await buildGateOf(request, 0)).toBe('everyone');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('is closed to a visitor without a session, and to a session the server cannot read', async () => {
    expect(await buildGateOf(request, 0)).toBe('closed');
    token.current = { githubLogin: 'octocat', error: 'RefreshTokenError' };
    expect(await buildGateOf(request, 0)).toBe('closed');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("asks the API's buildOpen for the signed-in person", async () => {
    token.current = { githubLogin: 'octocat' };
    graphqlDirect.mockResolvedValueOnce({ buildOpen: true });
    expect(await buildGateOf(request, 0)).toBe('person');
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce({ buildOpen: false });
    expect(await buildGateOf(request, 0)).toBe('closed');
  });

  it('fails closed: a missing field, an error or a slow answer is a no', async () => {
    token.current = { githubLogin: 'octocat' };
    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"buildOpen\\""}]'));
    expect(await buildGateOf(request, 0)).toBe('closed');
    graphqlDirect.mockResolvedValueOnce({ buildOpen: null });
    expect(await buildGateOf(request, 0)).toBe('closed');

    vi.useFakeTimers();
    graphqlDirect.mockReturnValueOnce(new Promise(() => {}));
    const late = buildGateOf(request, 0);
    await vi.advanceTimersByTimeAsync(BUILD_OPEN_TIMEOUT_MS);
    expect(await late).toBe('closed');
  });

  it('is closed without a login, asking nothing', async () => {
    expect(await buildOpenFor(null)).toBe(false);
    expect(await buildOpenFor('')).toBe(false);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
