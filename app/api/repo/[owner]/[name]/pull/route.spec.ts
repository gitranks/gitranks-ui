import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, revalidateTag, current } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  revalidateTag: vi.fn(),
  current: { session: null as Session | null },
}));

type Params = { owner: string; name: string };
type Ctx = { params: Promise<Params> };
type Handler = (req: NextRequest & { auth: Session | null }, ctx: Ctx) => unknown;

// `auth(handler)` hands the handler the request with its session.
vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, ctx: Ctx) => {
    req.auth = current.session;
    return handler(req, ctx);
  },
}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('next/cache', () => ({ revalidateTag }));

const { GET, POST } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, ctx: Ctx) => Promise<Response>;
  POST: (req: NextRequest, ctx: Ctx) => Promise<Response>;
};

const call = (handler: typeof GET, owner = 'Octo-Org', name = 'hello.world', method = 'GET') =>
  handler(new NextRequest(`https://gitranks.com/api/repo/${owner}/${name}/pull`, { method }), {
    params: Promise.resolve({ owner, name }),
  });

const signIn = (authMode?: 'identity' | 'token') => {
  current.session = { user: { githubLogin: 'octocat', authMode }, expires: '2099-01-01T00:00:00.000Z' };
};

const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const postBody = (owner: string, name: string) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ owner, name }),
});

const finished = (id: string, status: 'done' | 'failed', finishedAt: string) => ({
  id,
  status,
  via: 'token',
  requestedAt: finishedAt,
  finishedAt,
  failure: status === 'failed' ? 'internal-stage' : null,
});

describe('repo pull route', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    revalidateTag.mockReset();
    current.session = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['GET', 'Failed to load the star history fetch'],
    ['POST', 'The star history fetch failed'],
  ])('%s answers 502 JSON when the upstream call throws', async (method, message) => {
    signIn('token');
    signedFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

    const response = await call(method === 'GET' ? GET : POST, 'octo', 'hello', method);

    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ message });
  });

  it.each([['GET'], ['POST']])('%s answers 502 JSON when a 200 body is not JSON', async (method) => {
    signIn('token');
    signedFetch.mockResolvedValueOnce(new Response('<html>oops</html>', { status: 200 }));

    const response = await call(method === 'GET' ? GET : POST, 'octo', 'hello', method);

    expect(response.status).toBe(502);
    expect(response.headers.get('Content-Type')).toContain('application/json');
  });

  describe('POST', () => {
    it('answers 401 when signed out, without calling the API', async () => {
      const response = await call(POST, 'octo-org', 'hello', 'POST');

      expect(response.status).toBe(401);
      expect(signedFetch).not.toHaveBeenCalled();
    });

    it.each([
      ['-octo', 'hello'],
      ['octo', 'hello world'],
      ['octo', '..%2Fadmin'],
      ['octo', '%E0%A4%A'],
      ['a'.repeat(40), 'hello'],
    ])('refuses %s/%s with 400, without calling the API', async (owner, name) => {
      signIn('token');

      const response = await call(POST, owner, name, 'POST');

      expect(response.status).toBe(400);
      expect(signedFetch).not.toHaveBeenCalled();
    });

    it('fetches on the visitor’s own access after a token sign-in', async () => {
      signIn('token');
      upstream(200, { status: 'running' });

      const response = await call(POST, 'Octo-Org', 'hello.world', 'POST');

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      await expect(response.json()).resolves.toEqual({ status: 'running' });
      expect(signedFetch).toHaveBeenCalledWith(
        '/repo/pull/token',
        postBody('Octo-Org', 'hello.world'),
        'client',
        'octocat',
      );
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it.each([['identity' as const], [undefined]])('uses the free fetch of the day for an %s sign-in', async (mode) => {
      signIn(mode);
      upstream(200, { status: 'not_starred' });

      await call(POST, 'octo', 'hello', 'POST');

      expect(signedFetch).toHaveBeenCalledWith('/repo/pull/daily', postBody('octo', 'hello'), 'client', 'octocat');
    });

    it('expires the cached page once a fetch started', async () => {
      signIn('identity');
      upstream(200, { status: 'started', pullId: 'p1', nextAt: '2026-10-27T00:00:00.000Z' });

      const response = await call(POST, 'Octo-Org', 'Hello', 'POST');

      await expect(response.json()).resolves.toEqual({
        status: 'started',
        pullId: 'p1',
        nextAt: '2026-10-27T00:00:00.000Z',
      });
      expect(revalidateTag).toHaveBeenCalledWith('repo:octo-org/hello', { expire: 0 });
    });

    it('expires the cached page after a refresh, so the reload shows the new count', async () => {
      signIn('identity');
      const refreshed = { status: 'refreshed', stars: 171, nextAt: '2026-10-29T00:00:00.000Z' };
      upstream(200, refreshed);

      const response = await call(POST, 'Octo-Org', 'Hello', 'POST');

      await expect(response.json()).resolves.toEqual(refreshed);
      expect(revalidateTag).toHaveBeenCalledWith('repo:octo-org/hello', { expire: 0 });
    });

    it.each([400, 401, 403, 502])('keeps a %i to a bare message', async (status) => {
      signIn('token');
      upstream(status, { message: 'detail', stack: 'internal' });

      const response = await call(POST, 'octo', 'hello', 'POST');

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ message: 'The star history fetch failed' });
    });
  });

  describe('GET', () => {
    const STATUS = {
      pull: null,
      allowance: { daily: { available: true, nextAt: null }, token: { used: 0, limit: 20, nextAt: null } },
    };

    it('reads the status without a login when signed out', async () => {
      upstream(200, { pull: null, allowance: null });

      const response = await call(GET);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      await expect(response.json()).resolves.toEqual({ pull: null, allowance: null });
      expect(signedFetch).toHaveBeenCalledWith(
        '/repo/pull/status?owner=Octo-Org&name=hello.world',
        {},
        'client',
        undefined,
      );
    });

    it('reads the status as the signed-in visitor', async () => {
      signIn('identity');
      upstream(200, STATUS);

      const response = await call(GET);

      await expect(response.json()).resolves.toEqual(STATUS);
      expect(signedFetch).toHaveBeenCalledWith(
        '/repo/pull/status?owner=Octo-Org&name=hello.world',
        {},
        'client',
        'octocat',
      );
    });

    it('refuses a name GitHub could not use with 400', async () => {
      const response = await call(GET, 'octo', 'a/b');

      expect(response.status).toBe(400);
      expect(signedFetch).not.toHaveBeenCalled();
    });

    it('passes a failed read on as its status', async () => {
      upstream(502, { message: 'upstream' });

      const response = await call(GET);

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({ message: 'Failed to load the star history fetch' });
    });

    it('expires the cached page once for a fetch that finished lately', async () => {
      const pull = finished('p2', 'done', new Date(Date.now() - 60_000).toISOString());
      upstream(200, { pull, allowance: null });
      upstream(200, { pull, allowance: null });

      await call(GET, 'Octo', 'Done-Repo');
      await call(GET, 'octo', 'done-repo');

      expect(revalidateTag).toHaveBeenCalledTimes(1);
      expect(revalidateTag).toHaveBeenCalledWith('repo:octo/done-repo', { expire: 0 });
    });

    it('expires the page again once the repeat window has passed', async () => {
      const start = Date.now();
      const now = vi.spyOn(Date, 'now').mockReturnValue(start);
      const pull = finished('p5', 'done', new Date(start - 60_000).toISOString());
      upstream(200, { pull, allowance: null });
      upstream(200, { pull, allowance: null });
      upstream(200, { pull, allowance: null });

      await call(GET, 'octo', 'repeat-repo');
      now.mockReturnValue(start + 14_000);
      await call(GET, 'octo', 'repeat-repo');
      now.mockReturnValue(start + 15_000);
      await call(GET, 'octo', 'repeat-repo');

      expect(revalidateTag).toHaveBeenCalledTimes(2);
    });

    it('expires the page for a fetch that failed lately, and for a slow one that finished an hour ago', async () => {
      upstream(200, { pull: finished('p6', 'failed', new Date(Date.now() - 60_000).toISOString()), allowance: null });
      upstream(200, {
        pull: finished('p7', 'done', new Date(Date.now() - 60 * 60_000).toISOString()),
        allowance: null,
      });

      await call(GET, 'octo', 'failed-repo');
      await call(GET, 'octo', 'slow-repo');

      expect(revalidateTag).toHaveBeenCalledWith('repo:octo/failed-repo', { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith('repo:octo/slow-repo', { expire: 0 });
    });

    it('answers only the fields the button needs', async () => {
      const pull = finished('p8', 'failed', '2026-10-26T09:00:00.000Z');
      const allowance = STATUS.allowance;
      upstream(200, { pull, allowance, extra: 'internal' });

      const response = await call(GET, 'octo', 'fields-repo');

      await expect(response.json()).resolves.toEqual({
        pull: { id: 'p8', status: 'failed', requestedAt: pull.requestedAt, finishedAt: pull.finishedAt },
        allowance,
      });
    });

    it('leaves the cache alone while a fetch runs', async () => {
      const requestedAt = new Date().toISOString();
      upstream(200, {
        pull: { id: 'p3', status: 'running', requestedAt, finishedAt: null },
        allowance: null,
      });

      await call(GET, 'octo', 'running-repo');

      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
