import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, graphqlDirect } = vi.hoisted(() => ({ auth: vi.fn(), graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { retryContributeSetup } = await import('./setup.actions');
const { RetryContributeSetupDocument } = await import('./contribute.documents');

describe('retryContributeSetup', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'newbie', email: 'n@example.com' }, expires: '2099-01-01' });
  });

  it("asks as the session's user and answers the state after", async () => {
    graphqlDirect.mockResolvedValueOnce({ retryContributeSetup: 'SETTING_UP' });
    expect(await retryContributeSetup()).toEqual({ ok: true, data: 'setting-up' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      RetryContributeSetupDocument,
      undefined,
      expect.objectContaining({ source: 'client', githubLogin: 'newbie' }),
    );

    graphqlDirect.mockResolvedValueOnce({ retryContributeSetup: 'FAILED' });
    expect(await retryContributeSetup()).toEqual({ ok: true, data: 'failed' });
    graphqlDirect.mockResolvedValueOnce({ retryContributeSetup: 'NONE' });
    expect(await retryContributeSetup()).toEqual({ ok: true, data: 'none' });
  });

  it('reads an answer it does not know as failed', async () => {
    graphqlDirect.mockResolvedValueOnce({ retryContributeSetup: 'SOMETHING_NEW' });
    expect(await retryContributeSetup()).toEqual({ ok: true, data: 'failed' });
  });

  it('asks nothing without a session, and answers a failure as one', async () => {
    auth.mockResolvedValueOnce(null);
    expect(await retryContributeSetup()).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();

    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await retryContributeSetup()).toMatchObject({ ok: false });
  });
});
