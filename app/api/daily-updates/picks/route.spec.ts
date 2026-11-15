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

const PICKS = [{ nameWithOwner: 'octo/rocket', pickedAt: '2026-11-15T10:00:00.000Z' }];

describe('/api/daily-updates/picks', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    current.session = null;
  });

  it.each([
    ['POST', POST],
    ['DELETE', DELETE],
  ] as const)('%s answers 401 and calls nothing without a session', async (method, handler) => {
    const response = await call(handler, method, { owner: 'octo', name: 'rocket' });

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

  it('POST picks the repository and passes the answer through', async () => {
    signIn();
    const answer = { status: 'picked', picks: PICKS, newPicksLeftToday: 2 };
    upstream(200, answer);

    const response = await call(POST, 'POST', { owner: 'octo', name: 'rocket' });

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual(answer);
    const [path, init, source, login] = signedFetch.mock.calls[0];
    expect([path, init.method, init.body, source, login]).toEqual([
      '/daily-updates/picks',
      'POST',
      JSON.stringify({ owner: 'octo', name: 'rocket' }),
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

    await expect((await call(POST, 'POST', { owner: 'octo', name: 'rocket' })).json()).resolves.toEqual(answer);
  });

  it('DELETE removes the pick through the API', async () => {
    signIn();
    upstream(200, { status: 'removed', picks: [] });

    const response = await call(DELETE, 'DELETE', { owner: 'octo', name: 'rocket' });

    await expect(response.json()).resolves.toEqual({ status: 'removed', picks: [] });
    const [path, init] = signedFetch.mock.calls[0];
    expect([path, init.method, init.body]).toEqual([
      '/daily-updates/picks/remove',
      'POST',
      JSON.stringify({ owner: 'octo', name: 'rocket' }),
    ]);
  });

  it('passes a closed viewer (403) on', async () => {
    signIn();
    upstream(403, { message: 'Forbidden' });

    expect((await call(POST, 'POST', { owner: 'octo', name: 'rocket' })).status).toBe(403);
  });
});
