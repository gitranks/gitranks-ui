import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, current } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }, ctx: { params: Promise<{ login: string }> }) => unknown;

// `auth(handler)` hands the handler the request with its session.
vi.mock('@/auth', () => ({
  auth:
    (handler: Handler) =>
    (req: NextRequest & { auth: Session | null }, ctx: { params: Promise<{ login: string }> }) => {
      req.auth = current.session;
      return handler(req, ctx);
    },
}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { GET, POST } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, ctx: { params: Promise<{ login: string }> }) => Promise<Response>;
  POST: (req: NextRequest, ctx: { params: Promise<{ login: string }> }) => Promise<Response>;
};

const call = (handler: typeof GET, login = 'OctoCat', method = 'GET') =>
  handler(new NextRequest(`https://gitranks.com/api/profile/${login}/stars-review`, { method }), {
    params: Promise.resolve({ login }),
  });

const signIn = (githubLogin: string) => {
  current.session = { user: { githubLogin }, expires: '2099-01-01T00:00:00.000Z' };
};

const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const OWNER_STATE = {
  status: 'REVIEWING',
  stars: 1234,
  repositories: 801,
  reportable: true,
  report: null,
  decision: null,
  decidedAt: null,
};

describe('stars review route', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    current.session = null;
  });

  it.each([
    ['GET', GET],
    ['POST', POST],
  ])('answers %s with 401 when signed out, without calling the API', async (method, handler) => {
    const response = await call(handler, 'OctoCat', method);

    expect(response.status).toBe(401);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('reads the owner state as the signed-in visitor', async () => {
    signIn('octocat');
    upstream(200, OWNER_STATE);

    const response = await call(GET);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(OWNER_STATE);
    expect(signedFetch).toHaveBeenCalledWith('/user/stars-review/OctoCat', {}, 'client', 'octocat');
  });

  it('sends the report for the profile in the url, as the signed-in visitor', async () => {
    signIn('octocat');
    upstream(200, { submittedAt: '2026-10-17T09:30:00.000Z' });

    const response = await call(POST, 'OctoCat', 'POST');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ submittedAt: '2026-10-17T09:30:00.000Z' });
    expect(signedFetch).toHaveBeenCalledWith(
      '/user/stars-review/report',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'OctoCat' }) },
      'client',
      'octocat',
    );
  });

  it.each([
    ['GET', GET, 403, { message: 'Forbidden' }],
    ['GET', GET, 404, { message: 'Not Found' }],
    ['POST', POST, 403, { message: 'Forbidden' }],
    ['POST', POST, 404, { message: 'Not Found' }],
    ['POST', POST, 409, { submittedAt: '2026-10-16T08:00:00.000Z' }],
  ])('passes %s %i through with its body', async (method, handler, status, body) => {
    signIn('octocat');
    upstream(status, body);

    const response = await call(handler, 'OctoCat', method);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(body);
  });

  it('keeps any other failure to a bare message', async () => {
    signIn('octocat');
    upstream(500, { message: 'Internal server error', detail: 'stack' });

    const response = await call(GET);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: 'Stars review request failed' });
  });

  it('refuses a login GitHub would not allow, without calling the API', async () => {
    signIn('octocat');

    const response = await call(GET, '..%2Fadmin');

    expect(response.status).toBe(400);
    expect(signedFetch).not.toHaveBeenCalled();
  });
});
