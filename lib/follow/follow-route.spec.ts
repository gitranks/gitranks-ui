import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionTokenOf, maySee } = vi.hoisted(() => ({
  sessionTokenOf: vi.fn(),
  maySee: vi.fn(async (_req: unknown) => true),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));

const { FOLLOW_BODY_MAX, followBodyOf, followCallerOf, followRefusalOf } = await import('./follow-route');

const request = (headers: Record<string, string> = {}, body?: string) =>
  new NextRequest('https://gitranks.com/api/follow/start', { method: 'POST', headers, body });

describe('the follow routes’ shared steps', () => {
  beforeEach(() => {
    sessionTokenOf.mockReset().mockResolvedValue(null);
    maySee.mockReset().mockResolvedValue(true);
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
  });

  it('name a visitor by their network address alone', async () => {
    expect(await followCallerOf(request({ 'cf-connecting-ip': '203.0.113.7' }))).toEqual({
      accountEmailVerified: false,
      visitorAddress: '203.0.113.7',
    });
    expect(await followCallerOf(request({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toEqual({
      accountEmailVerified: false,
      visitorAddress: '198.51.100.1',
    });
  });

  it('mark the viewer’s email verified only when the session read it verified for that same address', async () => {
    sessionTokenOf.mockResolvedValue({
      githubLogin: 'octocat',
      email: 'Octo@Example.com',
      verifiedEmail: 'octo@example.com',
    });
    expect(await followCallerOf(request())).toEqual({
      githubLogin: 'octocat',
      accountEmail: 'Octo@Example.com',
      accountEmailVerified: true,
    });

    sessionTokenOf.mockResolvedValue({
      githubLogin: 'octocat',
      email: 'new@example.com',
      verifiedEmail: 'octo@example.com',
    });
    expect(await followCallerOf(request())).toMatchObject({ accountEmailVerified: false });

    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
    expect(await followCallerOf(request())).toMatchObject({ accountEmailVerified: false });
  });

  it('treat a session that needs a new sign-in as a visitor', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com', error: 'RefreshTokenError' });
    expect(await followCallerOf(request())).toEqual({ accountEmailVerified: false });
  });

  it('refuse a change from another site, and anyone the packages are hidden from', async () => {
    expect((await followRefusalOf(request({ origin: 'https://evil.example' }), { change: true, maySee }))?.status).toBe(
      403,
    );

    maySee.mockResolvedValue(false);
    const hidden = await followRefusalOf(request({ origin: 'https://gitranks.com' }), { change: true, maySee });
    expect(hidden?.status).toBe(404);
    expect(hidden?.headers.get('Cache-Control')).toBe('private, no-store');

    maySee.mockResolvedValue(true);
    expect(await followRefusalOf(request({ origin: 'https://gitranks.com' }), { change: true, maySee })).toBeNull();
  });

  it('read a JSON body up to its size limit', async () => {
    expect(await followBodyOf(request({}, '{"a":1}'))).toEqual({ a: 1 });
    expect(await followBodyOf(request({}, 'not json'))).toBeUndefined();
    expect(await followBodyOf(request({}, `"${'x'.repeat(FOLLOW_BODY_MAX)}"`))).toBeUndefined();
  });
});
