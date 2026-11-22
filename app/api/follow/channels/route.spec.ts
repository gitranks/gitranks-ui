import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionTokenOf, readFollowChannels, readLinkToken } = vi.hoisted(() => ({
  sessionTokenOf: vi.fn(),
  readFollowChannels: vi.fn(),
  readLinkToken: vi.fn(async (_kind: string): Promise<string | null> => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/follow/follow-api', () => ({ readFollowChannels }));
vi.mock('@/lib/link-token/link-cookie', () => ({ readLinkToken }));

const { GET } = await import('./route');

const call = (search = '') => GET(new NextRequest(`https://gitranks.com/api/follow/channels${search}`));
const channels = { channels: [], dependents: 16, notable: 4 };

describe('GET /api/follow/channels', () => {
  beforeEach(() => {
    sessionTokenOf.mockReset().mockResolvedValue(null);
    readLinkToken.mockReset().mockResolvedValue(null);
    readFollowChannels.mockReset().mockResolvedValue({ ok: true, data: channels });
  });

  it('asks for one package by its name, never kept by a cache', async () => {
    const response = await call('?package=%40nebula%2Fui');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ ...channels, settingsLink: false, verifiedEmail: null });
    expect(readFollowChannels).toHaveBeenCalledWith(
      { accountEmailVerified: false },
      { registry: 'npm', name: '@nebula/ui' },
    );
  });

  it('says whether this browser holds an email settings link, never the key itself', async () => {
    const key = 'k'.repeat(43);
    readLinkToken.mockResolvedValue(key);

    const response = await call();
    const text = await response.text();

    expect(readLinkToken).toHaveBeenCalledWith('settings');
    expect(JSON.parse(text)).toEqual({ ...channels, settingsLink: true, verifiedEmail: null });
    expect(text).not.toContain(key);
  });

  it('offers Settings to a signed-in viewer, whose own list it opens on', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat' });
    expect(await (await call()).json()).toEqual({ ...channels, settingsLink: true, verifiedEmail: null });
  });

  it('answers a signed-in viewer their own email only when GitHub had it verified at the sign-in', async () => {
    sessionTokenOf.mockResolvedValue({
      githubLogin: 'octocat',
      email: 'Octo@Example.com',
      verifiedEmail: 'octo@example.com',
    });
    expect((await (await call()).json()).verifiedEmail).toBe('Octo@Example.com');

    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
    expect((await (await call()).json()).verifiedEmail).toBeNull();

    sessionTokenOf.mockResolvedValue({
      githubLogin: 'octocat',
      email: 'new@example.com',
      verifiedEmail: 'old@example.com',
    });
    expect((await (await call()).json()).verifiedEmail).toBeNull();
  });

  it('refuses a name npm never takes', async () => {
    expect((await call('?package=..%2Fx')).status).toBe(400);
  });
});
