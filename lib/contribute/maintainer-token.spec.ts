import { beforeEach, describe, expect, it, vi } from 'vitest';

const { jar, store, currentSessionToken } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    store,
    jar: {
      get: vi.fn((name: string) => (store.has(name) ? { name, value: store.get(name) } : undefined)),
      set: vi.fn((name: string, value: string, options?: { maxAge?: number }) => {
        if (options?.maxAge === 0) store.delete(name);
        else store.set(name, value);
      }),
    },
    currentSessionToken: vi.fn(),
  };
});
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => jar }));
vi.mock('./session-token', () => ({ currentSessionToken }));

const {
  MAINTAINER_TOKEN_TTL_MS,
  currentMaintainerToken,
  dropExpiredMaintainerToken,
  lightSignInSession,
  maintainerSignInCookie,
  maintainerTokenOf,
  markMaintainerSignIn,
  takeMaintainerSignIn,
  withMaintainerToken,
} = await import('./maintainer-token');

const NOW = Date.UTC(2026, 9, 29, 12);
const SESSION = { sub: 'user-1', githubLogin: 'octocat', authMode: 'identity' as const };
const MARK = maintainerSignInCookie().name;

/** Auth.js's record of where the sign-in being completed returns to, as it stores it (absolute). */
const returnsTo = (path: string, name = 'authjs.callback-url') => store.set(name, `http://localhost${path}`);

/** The page's sign-in, started: the mark is set and the sign-in will return to the address it answers. */
const startPageSignIn = async () => {
  const redirectTo = await markMaintainerSignIn();
  returnsTo(redirectTo);
  return redirectTo;
};

beforeEach(() => {
  store.clear();
  jar.get.mockClear();
  jar.set.mockClear();
  currentSessionToken.mockReset();
  currentSessionToken.mockResolvedValue(null);
});

describe("the maintainers page's GitHub token", () => {
  it('is kept for an hour, or until GitHub says it expires if that is sooner', () => {
    expect(withMaintainerToken(SESSION, 'gho_x', undefined, NOW)).toEqual({
      ...SESSION,
      maintainerToken: 'gho_x',
      maintainerTokenExpiresAt: NOW + MAINTAINER_TOKEN_TTL_MS,
    });
    const soon = NOW / 1000 + 600;
    expect(withMaintainerToken(SESSION, 'gho_x', soon, NOW).maintainerTokenExpiresAt).toBe(soon * 1000);
    expect(withMaintainerToken(SESSION, undefined, undefined, NOW)).toEqual(SESSION);
  });

  it('is read only while it lasts', () => {
    const token = withMaintainerToken(SESSION, 'gho_x', undefined, NOW);

    expect(maintainerTokenOf(token, NOW + 1)).toBe('gho_x');
    expect(maintainerTokenOf(token, NOW + MAINTAINER_TOKEN_TTL_MS)).toBeNull();
    expect(maintainerTokenOf(SESSION, NOW)).toBeNull();
    expect(maintainerTokenOf(null, NOW)).toBeNull();
    expect(maintainerTokenOf({ ...SESSION, maintainerToken: 'gho_x' }, NOW)).toBeNull();
  });

  it('leaves the session once it has run out, and only then', () => {
    const live = withMaintainerToken(SESSION, 'gho_x', undefined, NOW);
    dropExpiredMaintainerToken(live, NOW + 1);
    expect(live.maintainerToken).toBe('gho_x');

    dropExpiredMaintainerToken(live, NOW + MAINTAINER_TOKEN_TTL_MS);
    expect(live).toEqual(SESSION);
  });

  it("is the current session's", async () => {
    currentSessionToken.mockResolvedValueOnce(withMaintainerToken(SESSION, 'gho_x', undefined, Date.now()));
    expect(await currentMaintainerToken()).toBe('gho_x');
    currentSessionToken.mockResolvedValueOnce(SESSION);
    expect(await currentMaintainerToken()).toBeNull();
    currentSessionToken.mockResolvedValueOnce(null);
    expect(await currentMaintainerToken()).toBeNull();
  });
});

describe("the maintainers page's sign-in mark", () => {
  it('is a five-minute cookie the browser cannot read, holding a nonce the sign-in returns with', async () => {
    const redirectTo = await markMaintainerSignIn();
    const [name, nonce, options] = jar.set.mock.calls[0];

    expect(name).toBe('gitranks-maintainer-sign-in');
    expect(nonce).toMatch(/^[0-9a-f-]{36}$/);
    expect(options).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 300 });
    expect(redirectTo).toBe(`/contribute/maintainers?s=${nonce}`);
    expect(await markMaintainerSignIn()).not.toBe(redirectTo);
  });

  it('is a __Host- cookie in production: Secure, the whole site, no domain', () => {
    expect(maintainerSignInCookie(true)).toEqual({
      name: '__Host-gitranks-maintainer-sign-in',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
    });
  });

  it("counts for the page's own sign-in, once", async () => {
    await startPageSignIn();

    expect(await takeMaintainerSignIn()).toBe(true);
    expect(store.has(MARK)).toBe(false);
    expect(await takeMaintainerSignIn()).toBe(false);
  });

  it('counts with the address Auth.js keeps over HTTPS too', async () => {
    const redirectTo = await markMaintainerSignIn();
    returnsTo(redirectTo, '__Secure-authjs.callback-url');

    expect(await takeMaintainerSignIn()).toBe(true);
  });

  it('never counts for another sign-in after the page sign-in was abandoned at GitHub', async () => {
    for (const elsewhere of ['/profile/octocat', '/contribute/maintainers', '/contribute/maintainers?s=other', '/']) {
      store.clear();
      await startPageSignIn();
      // Cancelled at GitHub: no callback ran, the mark is still there. The header's sign-in then starts from elsewhere.
      returnsTo(elsewhere);

      expect(await takeMaintainerSignIn()).toBe(false);
      expect(store.has(MARK)).toBe(false);
    }
  });

  it('never counts without a mark, or with one that is not a nonce', async () => {
    returnsTo('/contribute/maintainers?s=1');
    expect(await takeMaintainerSignIn()).toBe(false);

    store.set(MARK, '1');
    expect(await takeMaintainerSignIn()).toBe(false);
  });

  it('still counts where the cookie cannot be cleared', async () => {
    await startPageSignIn();
    jar.set.mockImplementationOnce(() => {
      throw new Error('read-only');
    });
    expect(await takeMaintainerSignIn()).toBe(true);
  });
});

describe('the session a light sign-in starts', () => {
  const TOKEN = 'gho_lightSignInToken123';
  const identity = { sub: 'user-1', githubLogin: 'octocat', authMode: 'identity' as const };
  const account = { access_token: TOKEN, expires_at: undefined };

  it('keeps no token without the page sign-in', async () => {
    expect(await lightSignInSession(identity, account)).toEqual(identity);
    expect(currentSessionToken).not.toHaveBeenCalled();
  });

  it('keeps no token for a header sign-in after an abandoned page sign-in', async () => {
    await startPageSignIn();
    returnsTo('/profile/octocat');

    expect(await lightSignInSession(identity, account)).toEqual(identity);
  });

  it("keeps the token for the page's own sign-in", async () => {
    await startPageSignIn();

    const token = await lightSignInSession(identity, account);

    expect(token).toMatchObject({ ...identity, maintainerToken: TOKEN });
    expect(token.maintainerTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it('leaves a signed-in user the session they had, token sign-in included, with the token added', async () => {
    await startPageSignIn();
    const had = { sub: 'user-1', githubLogin: 'OctoCat', authMode: 'token' as const, access_token: 'ghu_ours' };
    currentSessionToken.mockResolvedValue(had);

    expect(await lightSignInSession(identity, account)).toMatchObject({ ...had, maintainerToken: TOKEN });
  });

  it('switches to the GitHub account signed in with, and starts afresh for a session needing a new sign-in', async () => {
    for (const had of [
      { sub: 'user-2', githubLogin: 'someone', authMode: 'token', access_token: 'ghu_other' },
      // The same user row with another GitHub account linked to it: still a switch to the account signed in with.
      { sub: 'user-1', githubLogin: 'someone', authMode: 'token', access_token: 'ghu_other' },
      {
        sub: 'user-1',
        githubLogin: 'octocat',
        authMode: 'token',
        access_token: 'ghu_ours',
        error: 'RefreshTokenError',
      },
    ]) {
      store.clear();
      await startPageSignIn();
      currentSessionToken.mockResolvedValueOnce(had);

      expect(await lightSignInSession(identity, account)).toEqual({
        ...identity,
        maintainerToken: TOKEN,
        maintainerTokenExpiresAt: expect.any(Number),
      });
    }
  });
});
