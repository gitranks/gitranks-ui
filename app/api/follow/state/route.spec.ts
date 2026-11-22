import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionTokenOf, readFollowState } = vi.hoisted(() => ({
  sessionTokenOf: vi.fn(),
  readFollowState: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/follow/follow-api', () => ({ readFollowState }));

const { POST } = await import('./route');

const call = (body: unknown) =>
  POST(
    new NextRequest('https://gitranks.com/api/follow/state', {
      method: 'POST',
      headers: { origin: 'https://gitranks.com' },
      body: JSON.stringify(body),
    }),
  );
const packages = [{ registry: 'npm', name: 'x' }];

describe('POST /api/follow/state', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
    sessionTokenOf.mockReset().mockResolvedValue(null);
    readFollowState.mockReset().mockResolvedValue({ ok: true, data: [] });
  });

  it('answers no follows to a visitor without asking the API', async () => {
    const response = await call({ packages });
    expect(await response.json()).toEqual({ follows: [] });
    expect(readFollowState).not.toHaveBeenCalled();
  });

  it('asks for the signed-in viewer’s follows', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat' });
    await call({ packages });
    expect(readFollowState).toHaveBeenCalledWith({ githubLogin: 'octocat', accountEmailVerified: false }, packages);
  });

  it('refuses a body without packages', async () => {
    expect((await call({})).status).toBe(400);
  });
});
