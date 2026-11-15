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

const { POST } = (await import('./route')) as unknown as { POST: (req: NextRequest) => Promise<Response> };

const visit = () => POST(new NextRequest('https://gitranks.com/api/daily-updates/visit', { method: 'POST' }));

describe('/api/daily-updates/visit', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    current.session = null;
  });

  it('answers 401 and calls nothing without a session', async () => {
    const response = await visit();

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('passes the answer through, signed for the visitor, with no body', async () => {
    current.session = { user: { githubLogin: 'octo-dev' }, expires: '2099-01-01T00:00:00.000Z' };
    const answer = { state: 'on', until: '2026-11-22T10:00:00.000Z', restarted: true, retry: false };
    signedFetch.mockResolvedValueOnce(new Response(JSON.stringify(answer), { status: 200 }));

    const response = await visit();

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual(answer);
    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/daily-updates/visit',
      { method: 'POST', cache: 'no-store' },
      'client',
      'octo-dev',
    );
  });

  it('answers 502 when the answer is not JSON', async () => {
    current.session = { user: { githubLogin: 'octo-dev' }, expires: '2099-01-01T00:00:00.000Z' };
    signedFetch.mockResolvedValueOnce(new Response('<html>oops</html>', { status: 200 }));

    expect((await visit()).status).toBe(502);
  });
});
