import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMaySeePackages, sessionTokenOf, readFollowChannels } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  sessionTokenOf: vi.fn(),
  readFollowChannels: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/follow/follow-api', () => ({ readFollowChannels }));

const { GET } = await import('./route');

const call = (search = '') => GET(new NextRequest(`https://gitranks.com/api/follow/channels${search}`));
const channels = { channels: [], dependents: 16, notable: 4 };

describe('GET /api/follow/channels', () => {
  beforeEach(() => {
    requestMaySeePackages.mockReset().mockResolvedValue(true);
    sessionTokenOf.mockReset().mockResolvedValue(null);
    readFollowChannels.mockReset().mockResolvedValue({ ok: true, data: channels });
  });

  it('answers the not-found answer to a viewer package pages are hidden from', async () => {
    requestMaySeePackages.mockResolvedValue(false);
    expect((await call()).status).toBe(404);
    expect(readFollowChannels).not.toHaveBeenCalled();
  });

  it('asks for one package by its name, never kept by a cache', async () => {
    const response = await call('?package=%40nebula%2Fui');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual(channels);
    expect(readFollowChannels).toHaveBeenCalledWith(
      { accountEmailVerified: false },
      { registry: 'npm', name: '@nebula/ui' },
    );
  });

  it('refuses a name npm never takes', async () => {
    expect((await call('?package=..%2Fx')).status).toBe(400);
  });
});
