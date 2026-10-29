import { encode } from 'next-auth/jwt';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: vi.fn() }));

const { sessionTokenOf } = await import('./session-token');

const SECRET = 'test-secret-for-the-session-token-spec';
const TOKEN = { sub: 'user-1', githubLogin: 'octocat', authMode: 'identity' };

const cookieOf = async (name: string) =>
  `${name}=${await encode({ token: TOKEN, secret: SECRET, salt: name })}; has-session=1`;

describe('sessionTokenOf', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(['authjs.session-token', '__Secure-authjs.session-token'])('reads the session from %s', async (name) => {
    vi.stubEnv('AUTH_SECRET', SECRET);
    const token = await sessionTokenOf({ headers: new Headers({ cookie: await cookieOf(name) }) });

    expect(token).toMatchObject(TOKEN);
  });

  it('is null without a session, a secret, or with a token it cannot open', async () => {
    vi.stubEnv('AUTH_SECRET', SECRET);
    expect(await sessionTokenOf({ headers: new Headers() })).toBeNull();
    expect(await sessionTokenOf({ headers: new Headers({ cookie: 'authjs.session-token=nope' }) })).toBeNull();

    vi.stubEnv('AUTH_SECRET', '');
    expect(
      await sessionTokenOf({ headers: new Headers({ cookie: await cookieOf('authjs.session-token') }) }),
    ).toBeNull();
  });
});
