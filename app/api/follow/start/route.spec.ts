import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMaySeePackages, sessionTokenOf, startFollow, readLinkToken } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  sessionTokenOf: vi.fn(),
  startFollow: vi.fn(),
  readLinkToken: vi.fn(async (_kind: string): Promise<string | null> => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/follow/follow-api', () => ({ startFollow }));
vi.mock('@/lib/link-token/link-cookie', () => ({ readLinkToken }));

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
    readLinkToken.mockReset().mockResolvedValue(null);
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
      null,
    );
  });

  it('names the viewer from the session alone, whatever the body says', async () => {
    // A session whose email GitHub did not mark verified: the body cannot make it so.
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
    await call({ ...press, githubLogin: 'someone-else', accountEmailVerified: true });
    expect(startFollow).toHaveBeenLastCalledWith(
      {
        githubLogin: 'octocat',
        accountEmail: 'octo@example.com',
        accountEmailVerified: false,
        visitorAddress: '203.0.113.7',
      },
      { packages: [{ registry: 'npm', name: 'x' }], events: ALL, channels: ['email'], email: 'me@example.com' },
      null,
    );

    // Signed out: a login in the body names nobody.
    sessionTokenOf.mockResolvedValue(null);
    await call({ ...press, githubLogin: 'octocat', accountEmail: 'octo@example.com', accountEmailVerified: true });
    expect(startFollow).toHaveBeenLastCalledWith(
      { accountEmailVerified: false, visitorAddress: '203.0.113.7' },
      { packages: [{ registry: 'npm', name: 'x' }], events: ALL, channels: ['email'], email: 'me@example.com' },
      null,
    );
  });

  it('passes the settings link’s key from its cookie, never from the body, and never answers it', async () => {
    const key = 'k'.repeat(43);
    readLinkToken.mockResolvedValue(key);
    startFollow.mockResolvedValue({
      ok: true,
      data: {
        refusal: null,
        notHeld: [],
        results: [
          { channel: 'email', package: { registry: 'npm', name: 'x' }, result: 'active', url: null, limit: null },
        ],
      },
    });

    const response = await call({ ...press, manageToken: 'from-the-body' });

    expect(readLinkToken).toHaveBeenCalledWith('settings');
    expect(startFollow).toHaveBeenCalledWith(
      { accountEmailVerified: false, visitorAddress: '203.0.113.7' },
      { packages: [{ registry: 'npm', name: 'x' }], events: ALL, channels: ['email'], email: 'me@example.com' },
      key,
    );
    const text = await response.text();
    expect(text).not.toContain(key);
    expect(JSON.parse(text).results[0].result).toBe('active');
  });

  it('asks nothing about the cookie for a press it refuses', async () => {
    await call({ ...press, email: 'nope' });
    requestMaySeePackages.mockResolvedValue(false);
    await call(press);
    expect(readLinkToken).not.toHaveBeenCalled();
  });

  it('answers the API’s failure with its status', async () => {
    startFollow.mockResolvedValue({ ok: false, failure: 'unavailable' });
    const response = await call(press);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'unavailable' });
  });
});
