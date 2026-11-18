import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMaySeePackages, sessionTokenOf, startFollow } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  sessionTokenOf: vi.fn(),
  startFollow: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/follow/follow-api', () => ({ startFollow }));

const { POST } = await import('./route');

const ALL = { notable: true, digest: true, milestones: true };
const press = { packages: [{ registry: 'npm', name: 'x' }], events: ALL, channels: ['email'], email: 'me@example.com' };
const call = (body: unknown, headers: Record<string, string> = { origin: 'https://gitranks.com' }) =>
  POST(
    new NextRequest('https://gitranks.com/api/follow/start', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '203.0.113.7', ...headers },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/follow/start', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
    requestMaySeePackages.mockReset().mockResolvedValue(true);
    sessionTokenOf.mockReset().mockResolvedValue(null);
    startFollow.mockReset().mockResolvedValue({ ok: true, data: { refusal: null, notHeld: [], results: [] } });
  });

  it('answers the not-found answer to a viewer package pages are hidden from, asking nothing', async () => {
    requestMaySeePackages.mockResolvedValue(false);
    const response = await call(press);
    expect(response.status).toBe(404);
    expect(startFollow).not.toHaveBeenCalled();
  });

  it('refuses a press sent from another site', async () => {
    expect((await call(press, { origin: 'https://evil.example' })).status).toBe(403);
    expect(startFollow).not.toHaveBeenCalled();
  });

  it('refuses a body of another shape', async () => {
    expect((await call({ ...press, email: 'nope' })).status).toBe(400);
    expect(startFollow).not.toHaveBeenCalled();
  });

  it('passes a visitor’s press on with their address, never kept by a cache', async () => {
    const response = await call(press);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ refusal: null, notHeld: [], results: [] });
    expect(startFollow).toHaveBeenCalledWith(
      { accountEmailVerified: false, visitorAddress: '203.0.113.7' },
      { packages: [{ registry: 'npm', name: 'x' }], events: ALL, channels: ['email'], email: 'me@example.com' },
    );
  });

  it('names the signed-in viewer from the session, whatever the body says', async () => {
    sessionTokenOf.mockResolvedValue({
      githubLogin: 'octocat',
      email: 'octo@example.com',
      verifiedEmail: 'octo@example.com',
    });
    await call({ ...press, githubLogin: 'someone-else', accountEmailVerified: true });
    expect(startFollow).toHaveBeenCalledWith(
      {
        githubLogin: 'octocat',
        accountEmail: 'octo@example.com',
        accountEmailVerified: true,
        visitorAddress: '203.0.113.7',
      },
      expect.not.objectContaining({ githubLogin: expect.anything() }),
    );
  });

  it('answers the API’s failure with its status', async () => {
    startFollow.mockResolvedValue({ ok: false, failure: 'unavailable' });
    const response = await call(press);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'unavailable' });
  });
});
