import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, current } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { POST, DELETE } = (await import('./route')) as unknown as {
  POST: (req: NextRequest) => Promise<Response>;
  DELETE: (req: NextRequest) => Promise<Response>;
};

const call = (handler: typeof POST, method: string, body: unknown) =>
  handler(
    new NextRequest('https://gitranks.com/api/daily-updates/picks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

const signIn = () => {
  current.session = { user: { githubLogin: 'octo-dev' }, expires: '2099-01-01T00:00:00.000Z' };
};

const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

const ROCKET = { kind: 'repo', name: 'octo/rocket' };
const PICKS = [{ kind: 'repo', name: 'octo/rocket', pickedAt: '2026-11-15T10:00:00.000Z' }];

describe('/api/daily-updates/picks', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    current.session = null;
  });

  it.each([
    ['POST', POST],
    ['DELETE', DELETE],
  ] as const)('%s answers 401 and calls nothing without a session', async (method, handler) => {
    const response = await call(handler, method, ROCKET);

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', POST],
    ['DELETE', DELETE],
  ] as const)('%s refuses a body that names no repository', async (method, handler) => {
    signIn();

    expect((await call(handler, method, {})).status).toBe(400);
    expect((await call(handler, method, { owner: 'octo', name: '../x' })).status).toBe(400);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', POST],
    ['DELETE', DELETE],
  ] as const)('%s refuses an unknown kind and a name that is no repository', async (method, handler) => {
    signIn();

    for (const body of [
      { kind: 'org', name: 'octo/rocket' },
      { kind: null, name: 'octo/rocket' },
      { kind: 'repo' },
      { kind: 'repo', name: 42 },
      { kind: 'repo', name: 'octo' },
      { kind: 'repo', name: 'octo/rocket/tree' },
      { kind: 'repo', name: 'octo/../x' },
      { kind: 'repo', name: '/rocket' },
      // A kind is the pick's: a body that names one is never read as `{ owner, name }`.
      { kind: 'org', owner: 'octo', name: 'rocket' },
    ]) {
      expect((await call(handler, method, body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', POST, '/daily-updates/picks'],
    ['DELETE', DELETE, '/daily-updates/picks/remove'],
  ] as const)('%s reads a body of `{ owner, name }` without a kind as a repository', async (method, handler, path) => {
    signIn();
    upstream(200, { status: 'removed', picks: [] });

    expect((await call(handler, method, { owner: 'octo', name: 'rocket' })).status).toBe(200);
    const [calledPath, init] = signedFetch.mock.calls[0];
    expect([calledPath, init.body]).toEqual([path, JSON.stringify(ROCKET)]);
  });

  it.each([
    ['POST', POST],
    ['DELETE', DELETE],
  ] as const)('%s refuses a body past 1,000 characters before calling the API', async (method, handler) => {
    signIn();

    const response = await call(handler, method, { ...ROCKET, pad: 'x'.repeat(1_000) });

    expect(response.status).toBe(413);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('POST picks the repository and passes the answer through', async () => {
    signIn();
    const answer = { status: 'picked', picks: PICKS, newPicksLeftToday: 2 };
    upstream(200, answer);

    const response = await call(POST, 'POST', ROCKET);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual(answer);
    const [path, init, source, login] = signedFetch.mock.calls[0];
    expect([path, init.method, init.body, source, login]).toEqual([
      '/daily-updates/picks',
      'POST',
      JSON.stringify(ROCKET),
      'client',
      'octo-dev',
    ]);
  });

  it.each([
    [{ status: 'full' }],
    [{ status: 'daily_limit', nextAt: '2026-11-16T00:00:00.000Z' }],
    [{ status: 'not_held' }],
    [{ status: 'not_starred' }],
  ])('POST passes %o through', async (answer) => {
    signIn();
    upstream(200, answer);

    await expect((await call(POST, 'POST', ROCKET)).json()).resolves.toEqual(answer);
  });

  it('DELETE removes the pick through the API', async () => {
    signIn();
    upstream(200, { status: 'removed', picks: [] });

    const response = await call(DELETE, 'DELETE', ROCKET);

    await expect(response.json()).resolves.toEqual({ status: 'removed', picks: [] });
    const [path, init] = signedFetch.mock.calls[0];
    expect([path, init.method, init.body]).toEqual(['/daily-updates/picks/remove', 'POST', JSON.stringify(ROCKET)]);
  });

  it('signs the session’s email beside the login when it holds one', async () => {
    current.session = {
      user: { githubLogin: 'octo-dev', email: 'octo@example.com' },
      expires: '2099-01-01T00:00:00.000Z',
    } as Session;
    upstream(200, { status: 'full' });

    await call(POST, 'POST', ROCKET);

    expect(signedFetch.mock.calls[0].slice(2)).toEqual(['client', 'octo-dev', 'octo@example.com']);
  });

  it('passes a closed viewer (403) on', async () => {
    signIn();
    upstream(403, { message: 'Forbidden' });

    expect((await call(POST, 'POST', ROCKET)).status).toBe(403);
  });
});
