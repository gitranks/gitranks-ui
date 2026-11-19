import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMaySeePackages, sessionTokenOf, changeFollow } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  sessionTokenOf: vi.fn(),
  changeFollow: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages }));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/follow/follow-api', () => ({ changeFollow }));

const { POST } = await import('./route');

const call = (body: unknown, origin = 'https://gitranks.com') =>
  POST(
    new NextRequest('https://gitranks.com/api/follow/change', {
      method: 'POST',
      headers: { origin },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/follow/change', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
    requestMaySeePackages.mockReset().mockResolvedValue(true);
    sessionTokenOf.mockReset().mockResolvedValue({ githubLogin: 'octocat' });
    changeFollow.mockReset().mockResolvedValue({ ok: true, data: null });
  });

  it('changes a signed-in viewer’s follow', async () => {
    const response = await call({ followId: 'f1', remove: true });
    expect(await response.json()).toEqual({ follow: null });
    expect(changeFollow).toHaveBeenCalledWith(
      { githubLogin: 'octocat', accountEmailVerified: false },
      { followId: 'f1', remove: true },
    );
  });

  it('answers the not-found answer to a viewer package pages are hidden from, asking nothing', async () => {
    requestMaySeePackages.mockResolvedValue(false);
    const response = await call({ followId: 'f1', remove: true });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(changeFollow).not.toHaveBeenCalled();
  });

  it('asks a visitor to sign in, and refuses another site and a body of another shape', async () => {
    expect((await call({ followId: 'f1', remove: true }, 'https://evil.example')).status).toBe(403);
    expect((await call({ followId: 'f1' })).status).toBe(400);
    sessionTokenOf.mockResolvedValue(null);
    expect((await call({ followId: 'f1', remove: true })).status).toBe(401);
    expect(changeFollow).not.toHaveBeenCalled();
  });
});
