import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { jar, currentSessionToken, lightSignInSession } = vi.hoisted(() => ({
  jar: { get: vi.fn(), set: vi.fn() },
  currentSessionToken: vi.fn(),
  lightSignInSession: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => jar }));
vi.mock('./contribute/session-token', () => ({ currentSessionToken }));
vi.mock('./contribute/maintainer-token', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./contribute/maintainer-token')>();
  return { ...actual, lightSignInSession: lightSignInSession.mockImplementation(actual.lightSignInSession) };
});

const { createAuthCallbacks } = await import('./auth-callbacks');
const { withMaintainerToken } = await import('./contribute/maintainer-token');

const TOKEN = 'gho_maintainerPageToken123';
const updateOne = vi.fn(async () => ({}));
const callbacks = createAuthCallbacks({ accounts: async () => ({ updateOne }) }) as unknown as {
  jwt: (params: Record<string, unknown>) => Promise<JWT>;
  session: (params: Record<string, unknown>) => Promise<Session>;
};

const fresh = (): JWT => ({ sub: 'user-1', name: 'Octo Cat', email: 'octo@example.com' });
const signInWith = (provider: string) => ({
  token: fresh(),
  account: { provider, access_token: `${provider}-access`, refresh_token: 'refresh', expires_at: 9_999_999_999 },
  profile: { login: 'octocat' },
});

describe('the Auth.js callbacks', () => {
  beforeEach(() => {
    jar.get.mockReset();
    jar.get.mockReturnValue(undefined);
    currentSessionToken.mockReset();
    currentSessionToken.mockResolvedValue(null);
    lightSignInSession.mockClear();
    updateOne.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("never give the browser the maintainers page's token", async () => {
    const token = withMaintainerToken({ ...fresh(), githubLogin: 'octocat', authMode: 'identity' }, TOKEN, undefined);

    const session = await callbacks.session({ session: { user: {}, expires: '2099-01-01T00:00:00.000Z' }, token });

    expect(JSON.stringify(session)).not.toContain(TOKEN);
    expect(JSON.stringify(session)).not.toContain('maintainerToken');
    expect(session.user).toEqual({ githubLogin: 'octocat', id: 'user-1', authMode: 'identity' });
  });

  it('keep the light sign-in as it always was without the page sign-in', async () => {
    const token = await callbacks.jwt(signInWith('github-basic'));

    expect(token).toEqual({
      ...fresh(),
      error: undefined,
      access_token: undefined,
      expires_at: undefined,
      refresh_token: undefined,
      githubLogin: 'octocat',
      authMode: 'identity',
    });
    expect(lightSignInSession).toHaveBeenCalledOnce();
  });

  it('never ask the maintainers page about the token sign-in or the pull request grant', async () => {
    expect(await callbacks.jwt(signInWith('github'))).toMatchObject({
      access_token: 'github-access',
      authMode: 'token',
    });

    const had = { sub: 'user-1', githubLogin: 'octocat', authMode: 'identity' as const };
    currentSessionToken.mockResolvedValueOnce(had);
    expect(await callbacks.jwt(signInWith('github-contribute'))).toEqual(had);

    expect(lightSignInSession).not.toHaveBeenCalled();
  });

  it("never write the maintainers page's token with a refreshed one", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ access_token: 'ghu_new', expires_in: 28_800, refresh_token: 'ghr_new' })),
    );
    const expired = withMaintainerToken(
      {
        ...fresh(),
        githubLogin: 'octocat',
        authMode: 'token',
        access_token: 'ghu_old',
        refresh_token: 'ghr_old',
        expires_at: 1,
      },
      TOKEN,
      undefined,
    );

    const token = await callbacks.jwt({ token: expired });

    expect(token).toMatchObject({ access_token: 'ghu_new', maintainerToken: TOKEN });
    expect(updateOne).toHaveBeenCalledOnce();
    expect(JSON.stringify(updateOne.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(updateOne.mock.calls)).not.toContain('maintainerToken');
  });
});
