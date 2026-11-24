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
vi.mock('./workspace/session-token', () => ({ currentSessionToken }));
vi.mock('./auth/light-sign-in', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth/light-sign-in')>();
  return { ...actual, lightSignInSession: lightSignInSession.mockImplementation(actual.lightSignInSession) };
});

const { createAuthCallbacks } = await import('./auth-callbacks');
const { withMaintainerToken } = await import('./auth/light-sign-in');

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
    // GitHub's email list, refused unless a test says otherwise: no spec reaches the network.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("never give the browser the maintainers page's token", async () => {
    const token = withMaintainerToken(
      { ...fresh(), githubLogin: 'octocat', authMode: 'identity' },
      TOKEN,
      undefined,
      Date.now(),
    );

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
      // The callback reads the clock as it runs: the token is added at the same time.
      Date.now(),
    );

    const token = await callbacks.jwt({ token: expired });

    expect(token).toMatchObject({ access_token: 'ghu_new', maintainerToken: TOKEN });
    expect(updateOne).toHaveBeenCalledOnce();
    expect(JSON.stringify(updateOne.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(updateOne.mock.calls)).not.toContain('maintainerToken');
  });

  describe("the session's verified email", () => {
    const emails = (list: unknown, status = 200) => {
      const fetchMock = vi.fn(async () => Response.json(list, { status }));
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };

    it.each(['github-basic', 'github'])('is kept at a %s sign-in when GitHub marks it verified', async (provider) => {
      const fetchMock = emails([
        { email: 'other@example.com', verified: true, primary: false },
        { email: 'Octo@Example.com', verified: true, primary: true },
      ]);

      const token = await callbacks.jwt(signInWith(provider));

      expect(token.verifiedEmail).toBe('octo@example.com');
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.github.com/user/emails');
      expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer ${provider}-access`);
    });

    it('is not kept when GitHub has it unverified, or only another address verified', async () => {
      emails([
        { email: 'octo@example.com', verified: false },
        { email: 'other@example.com', verified: true },
      ]);

      expect((await callbacks.jwt(signInWith('github-basic'))).verifiedEmail).toBeUndefined();
    });

    it('is dropped at a later sign-in that no longer finds it verified', async () => {
      emails([{ email: 'octo@example.com', verified: false }]);
      const signIn = signInWith('github');

      const token = await callbacks.jwt({ ...signIn, token: { ...signIn.token, verifiedEmail: 'octo@example.com' } });

      expect(token.verifiedEmail).toBeUndefined();
    });

    it('never fails the sign-in: a refusal or a network error leaves it out', async () => {
      emails({ message: 'Resource not accessible by integration' }, 403);
      expect(await callbacks.jwt(signInWith('github-basic'))).toMatchObject({ githubLogin: 'octocat' });

      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('offline');
        }),
      );
      const token = await callbacks.jwt(signInWith('github'));
      expect(token).toMatchObject({ githubLogin: 'octocat', authMode: 'token' });
      expect(token.verifiedEmail).toBeUndefined();
    });

    it.each([
      ['unset', [{ email: 'octo@example.com', verified: false }], 'octo@example.com', undefined],
      ['set', [{ email: 'octo@example.com', verified: true }], undefined, 'octo@example.com'],
    ])(
      'is %s on the session a maintainers page sign-in keeps, from this sign-in’s read',
      async (_, list, before, after) => {
        emails(list);
        const kept: JWT = {
          ...fresh(),
          githubLogin: 'octocat',
          authMode: 'identity',
          ...(before ? { verifiedEmail: before } : {}),
        };
        lightSignInSession.mockResolvedValueOnce(kept);

        const token = await callbacks.jwt(signInWith('github-basic'));

        expect(token).toMatchObject({ githubLogin: 'octocat', authMode: 'identity' });
        expect(token.verifiedEmail).toBe(after);
      },
    );

    it('is not read again between sign-ins, nor given to the browser', async () => {
      const fetchMock = emails([]);
      const kept = {
        ...fresh(),
        githubLogin: 'octocat',
        authMode: 'identity' as const,
        verifiedEmail: 'octo@example.com',
      };

      expect(await callbacks.jwt({ token: kept })).toMatchObject({ verifiedEmail: 'octo@example.com' });
      expect(fetchMock).not.toHaveBeenCalled();

      const session = await callbacks.session({
        session: { user: {}, expires: '2099-01-01T00:00:00.000Z' },
        token: kept,
      });
      expect(JSON.stringify(session)).not.toContain('verifiedEmail');
    });
  });
});
