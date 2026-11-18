import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { followOf, subscriberOf } from '@/lib/link-token/__fixtures__/follow-links';

const { requestMaySeePackages, sessionTokenOf, pressSessionSettings, readLinkToken } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  sessionTokenOf: vi.fn(),
  pressSessionSettings: vi.fn(),
  readLinkToken: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/link-token/link-cookie', () => ({ readLinkToken }));
vi.mock('@/lib/follow/following-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/follow/following-session')>()),
  pressSessionSettings,
}));

const { POST } = await import('./route');

const call = (body: unknown, origin = 'https://gitranks.com') =>
  POST(
    new NextRequest('https://gitranks.com/api/follow/following', {
      method: 'POST',
      headers: { origin },
      body: JSON.stringify(body),
    }),
  );
const FOLLOW_ID = followOf().id;
const LIST = { kind: 'list', subscribers: [subscriberOf()] };

describe('POST /api/follow/following', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
    requestMaySeePackages.mockReset().mockResolvedValue(true);
    sessionTokenOf.mockReset().mockResolvedValue({ githubLogin: 'octocat' });
    pressSessionSettings.mockReset().mockResolvedValue(LIST);
    readLinkToken.mockReset();
  });

  it('passes a signed-in viewer’s press on by their session and answers the page, reading no link key', async () => {
    const response = await call({ action: 'remove', followId: FOLLOW_ID });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual(LIST);
    expect(pressSessionSettings).toHaveBeenCalledWith(
      { githubLogin: 'octocat', accountEmailVerified: false },
      { action: 'remove', followId: FOLLOW_ID },
    );
    expect(readLinkToken).not.toHaveBeenCalled();
  });

  it('answers the not-found answer to a viewer package pages are hidden from, changing nothing', async () => {
    requestMaySeePackages.mockResolvedValue(false);
    const response = await call({ action: 'stop-all' });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(pressSessionSettings).not.toHaveBeenCalled();
  });

  it('refuses another site, a press of another shape, and a visitor', async () => {
    expect((await call({ action: 'stop-all' }, 'https://evil.example')).status).toBe(403);
    expect((await call({ action: 'remove', followId: 'not-an-id' })).status).toBe(400);
    sessionTokenOf.mockResolvedValue(null);
    expect((await call({ action: 'stop-all' })).status).toBe(401);
    expect(pressSessionSettings).not.toHaveBeenCalled();
  });

  it('answers not found when the feature is closed to the viewer', async () => {
    pressSessionSettings.mockResolvedValue(null);
    expect((await call({ action: 'stop-all' })).status).toBe(404);
  });
});
