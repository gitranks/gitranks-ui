import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { everyone } = vi.hoisted(() => ({ everyone: vi.fn(async () => false) }));
vi.mock('@/lib/learn/learn-everyone', () => ({ learnOpenToEveryone: everyone }));

const { GET } = await import('./route');

describe("the visitors' Learn route", () => {
  beforeEach(() => everyone.mockReset());

  it('answers whether Learn is open to everyone, kept by shared caches for a minute', async () => {
    everyone.mockResolvedValueOnce(false);
    const closed = await GET();
    expect(await closed.json()).toEqual({ open: false });
    expect(closed.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');

    everyone.mockResolvedValueOnce(true);
    expect(await (await GET()).json()).toEqual({ open: true });
  });
});
