import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => ({ zone: 'Asia/Tokyo' as string | null }));
vi.mock('@/lib/workspace/email-settings', async (original) => ({
  ...(await original<typeof import('@/lib/workspace/email-settings')>()),
  browserTimeZone: () => browser.zone,
}));

// The save of the zone is a server action: not reached by these reads.
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmailSettings: vi.fn() }));

const { readBuildZone } = await import('./zone-live');

const fetchMock = vi.fn();
const answer = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  browser.zone = 'Asia/Tokyo';
});

afterEach(() => vi.unstubAllGlobals());

describe('the zone a page of Build writes dates in', () => {
  it("is the zone the API counts the person's days in, read from its route, never kept", async () => {
    answer({ zone: 'Europe/Kyiv' });
    await expect(readBuildZone()).resolves.toBe('Europe/Kyiv');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/build/zone', { cache: 'no-store' });
  });

  it("is the browser's own when the route answers none, a name that is not a zone, or fails", async () => {
    answer({ zone: null });
    await expect(readBuildZone()).resolves.toBe('Asia/Tokyo');
    answer({ zone: 'Not/AZone' });
    await expect(readBuildZone()).resolves.toBe('Asia/Tokyo');
    answer({}, 500);
    await expect(readBuildZone()).resolves.toBe('Asia/Tokyo');
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(readBuildZone()).resolves.toBe('Asia/Tokyo');
  });

  it('is none when the browser tells none either: the dates are then written in UTC', async () => {
    browser.zone = null;
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(readBuildZone()).resolves.toBeUndefined();
  });
});
