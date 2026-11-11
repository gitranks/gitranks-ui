import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { contributeMcpSignIn, resetContributeMcpSignIn } = await import('./mcp-sign-in');

describe('whether agents sign in with GitHub', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    resetContributeMcpSignIn();
  });

  it('asks the API once a minute, one ask at a time, as the server', async () => {
    graphqlDirect.mockResolvedValue({ contributeMcpSignIn: true });
    expect(await Promise.all([contributeMcpSignIn(0), contributeMcpSignIn(0)])).toEqual([true, true]);
    expect(graphqlDirect).toHaveBeenCalledOnce();
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
    expect(await contributeMcpSignIn(59_999)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledOnce();

    graphqlDirect.mockResolvedValue({ contributeMcpSignIn: false });
    expect(await contributeMcpSignIn(60_000)).toBe(false);
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
  });

  it('is off while the API does not answer, keeps the last answer on a failure and asks again 10 seconds later', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"contributeMcpSignIn\\""}]'));
    expect(await contributeMcpSignIn(0)).toBe(false);

    graphqlDirect.mockResolvedValueOnce({ contributeMcpSignIn: true });
    expect(await contributeMcpSignIn(10_000)).toBe(true);

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await contributeMcpSignIn(70_000)).toBe(true);
    expect(await contributeMcpSignIn(75_000)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledTimes(3);
  });
});
