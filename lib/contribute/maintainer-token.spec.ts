import { beforeEach, describe, expect, it, vi } from 'vitest';

const { jar, currentSessionToken } = vi.hoisted(() => ({
  jar: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  currentSessionToken: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => jar }));
vi.mock('./session-token', () => ({ currentSessionToken }));

const {
  MAINTAINER_SIGN_IN_COOKIE,
  MAINTAINER_TOKEN_TTL_MS,
  currentMaintainerToken,
  dropExpiredMaintainerToken,
  lightSignInSession,
  maintainerTokenOf,
  markMaintainerSignIn,
  takeMaintainerSignIn,
  withMaintainerToken,
} = await import('./maintainer-token');

const NOW = Date.UTC(2026, 9, 29, 12);
const SESSION = { sub: 'user-1', githubLogin: 'octocat', authMode: 'identity' as const };

describe("the maintainers page's GitHub token", () => {
  beforeEach(() => {
    jar.get.mockReset();
    jar.set.mockReset();
    jar.delete.mockReset();
    currentSessionToken.mockReset();
  });

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
  beforeEach(() => {
    jar.get.mockReset();
    jar.set.mockReset();
    jar.delete.mockReset();
  });

  it('is a short-lived cookie the browser cannot read', async () => {
    await markMaintainerSignIn();

    expect(jar.set).toHaveBeenCalledWith(MAINTAINER_SIGN_IN_COOKIE, '1', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
  });

  it('is used up by the sign-in that reads it', async () => {
    jar.get.mockReturnValueOnce({ value: '1' });
    expect(await takeMaintainerSignIn()).toBe(true);
    expect(jar.delete).toHaveBeenCalledWith(MAINTAINER_SIGN_IN_COOKIE);

    jar.get.mockReturnValueOnce(undefined);
    expect(await takeMaintainerSignIn()).toBe(false);
    expect(jar.delete).toHaveBeenCalledTimes(1);
  });

  it('still counts where the cookie cannot be cleared', async () => {
    jar.get.mockReturnValueOnce({ value: '1' });
    jar.delete.mockImplementationOnce(() => {
      throw new Error('read-only');
    });
    expect(await takeMaintainerSignIn()).toBe(true);
  });
});

describe('the session a light sign-in starts', () => {
  const TOKEN = 'gho_lightSignInToken123';
  const identity = { sub: 'user-1', githubLogin: 'octocat', authMode: 'identity' as const };
  const account = { access_token: TOKEN, expires_at: undefined };

  beforeEach(() => {
    jar.get.mockReset();
    jar.delete.mockReset();
    currentSessionToken.mockReset();
    currentSessionToken.mockResolvedValue(null);
  });

  it('keeps no token, unless it was started on the maintainers page', async () => {
    jar.get.mockReturnValue(undefined);

    expect(await lightSignInSession(identity, account)).toEqual(identity);
    expect(currentSessionToken).not.toHaveBeenCalled();
  });

  it("keeps the maintainers page's token, and uses up the mark", async () => {
    jar.get.mockReturnValue({ value: '1' });

    const token = await lightSignInSession(identity, account);

    expect(token).toMatchObject({ ...identity, maintainerToken: TOKEN });
    expect(token.maintainerTokenExpiresAt).toBeGreaterThan(Date.now());
    expect(jar.delete).toHaveBeenCalledWith(MAINTAINER_SIGN_IN_COOKIE);
  });

  it('leaves a signed-in user the session they had, token sign-in included, with the token added', async () => {
    jar.get.mockReturnValue({ value: '1' });
    const had = { sub: 'user-1', githubLogin: 'octocat', authMode: 'token' as const, access_token: 'ghu_ours' };
    currentSessionToken.mockResolvedValue(had);

    expect(await lightSignInSession(identity, account)).toMatchObject({ ...had, maintainerToken: TOKEN });
  });

  it('starts from the new sign-in for another user, or for a session that needs a new sign-in', async () => {
    jar.get.mockReturnValue({ value: '1' });
    for (const had of [
      { sub: 'user-2', githubLogin: 'someone', authMode: 'token', access_token: 'ghu_other' },
      {
        sub: 'user-1',
        githubLogin: 'octocat',
        authMode: 'token',
        access_token: 'ghu_ours',
        error: 'RefreshTokenError',
      },
    ]) {
      currentSessionToken.mockResolvedValueOnce(had);

      expect(await lightSignInSession(identity, account)).toEqual({
        ...identity,
        maintainerToken: TOKEN,
        maintainerTokenExpiresAt: expect.any(Number),
      });
    }
  });
});
