import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, revalidateTag, current } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  revalidateTag: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

// `auth(handler)` hands the handler the request with its session.
vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('next/cache', () => ({ revalidateTag }));

const { GET, POST } = (await import('./route')) as unknown as {
  GET: (req: NextRequest) => Promise<Response>;
  POST: (req: NextRequest) => Promise<Response>;
};

const URL = 'https://gitranks.com/api/daily-updates';
const get = () => GET(new NextRequest(URL));
const start = (body: unknown) =>
  POST(
    new NextRequest(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

const signIn = () => {
  current.session = { user: { githubLogin: 'Octo-Dev', authMode: 'identity' }, expires: '2099-01-01T00:00:00.000Z' };
};

const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const ME = {
  open: true,
  state: 'on',
  until: '2026-11-22T10:00:00.000Z',
  manual: { available: true, nextAt: null },
  picks: [{ nameWithOwner: 'octo/rocket', pickedAt: '2026-11-15T10:00:00.000Z' }],
  newPicksLeftToday: 2,
};

describe('/api/daily-updates', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    revalidateTag.mockReset();
    current.session = null;
  });

  it('answers 401 and calls nothing without a session', async () => {
    for (const response of [await get(), await start({ login: 'octo-dev' })]) {
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('GET passes the state through, signed for the visitor, never stored', async () => {
    signIn();
    upstream(200, ME);

    const response = await get();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual(ME);
    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/daily-updates/me',
      { method: 'GET', cache: 'no-store' },
      'client',
      'Octo-Dev',
    );
  });

  it('GET passes a refusal on with its status, and a call that throws as 502', async () => {
    signIn();
    upstream(404, { message: 'Not Found' });
    expect((await get()).status).toBe(404);

    signedFetch.mockRejectedValueOnce(new Error('connection refused'));
    const response = await get();
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: 'Failed to load daily updates' });
  });

  it('POST refuses a body without a login', async () => {
    signIn();

    expect((await start({})).status).toBe(400);
    expect((await start({ login: 'not a login' })).status).toBe(400);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('POST starts with the login of the body, and expires the profile on `started`', async () => {
    signIn();
    const started = {
      status: 'started',
      until: '2026-11-22T10:00:00.000Z',
      refreshed: true,
      nextAt: '2026-11-16T10:00:00.000Z',
    };
    upstream(200, started);

    const response = await start({ login: 'Octo-Dev' });

    await expect(response.json()).resolves.toEqual(started);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const [path, init, source, login] = signedFetch.mock.calls[0];
    expect([path, init.method, init.body, source, login]).toEqual([
      '/daily-updates/start',
      'POST',
      JSON.stringify({ login: 'Octo-Dev' }),
      'client',
      'Octo-Dev',
    ]);
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('profile:octo-dev', { expire: 0 });
  });

  it.each([
    [{ status: 'not_starred' }],
    [{ status: 'blocked', until: '2026-11-15T12:00:00.000Z' }],
    [{ status: 'busy' }],
    [{ status: 'fetching' }],
    [{ status: 'not_own' }],
  ])('POST passes %o through and expires nothing', async (answer) => {
    signIn();
    upstream(200, answer);

    await expect((await start({ login: 'octo-dev' })).json()).resolves.toEqual(answer);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('POST passes a removed account (410) and a closed viewer (403) on', async () => {
    signIn();
    upstream(410, { message: 'Gone' });
    expect((await start({ login: 'octo-dev' })).status).toBe(410);

    upstream(403, { message: 'Forbidden' });
    expect((await start({ login: 'octo-dev' })).status).toBe(403);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
