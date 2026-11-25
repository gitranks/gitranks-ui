import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, graphqlDirect } = vi.hoisted(() => ({ auth: vi.fn(), graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { markContributeOnboarded } = await import('./onboarding.actions');
const { MarkContributeOnboardedDocument } = await import('./contribute.documents');

describe('markContributeOnboarded', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat', email: 'o@example.com' }, expires: '2099-01-01' });
  });

  it('asks as the session’s user and answers what the API says: set, or nothing connected', async () => {
    graphqlDirect.mockResolvedValueOnce({ markContributeOnboarded: true });
    expect(await markContributeOnboarded()).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenCalledWith(
      MarkContributeOnboardedDocument,
      undefined,
      expect.objectContaining({ source: 'client', githubLogin: 'octocat' }),
    );

    graphqlDirect.mockResolvedValueOnce({ markContributeOnboarded: false });
    expect(await markContributeOnboarded()).toEqual({ ok: true, data: false });
  });

  it('sets nothing without a session, and answers a failure as one', async () => {
    auth.mockResolvedValueOnce(null);
    expect(await markContributeOnboarded()).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();

    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await markContributeOnboarded()).toMatchObject({ ok: false });
  });
});
