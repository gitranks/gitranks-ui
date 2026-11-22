import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheTag, cacheLife } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheTag, cacheLife }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => undefined,
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { GET } = await import('./route');

const apiHero = {
  week: '2026-W47',
  startsAt: '2026-11-16T00:00:00.000Z',
  endsAt: '2026-11-23T00:00:00.000Z',
  repo: { nameWithOwner: 'octo-labs/scroll-guard' },
  package: { registry: 'NPM', name: 'scroll-guard' },
  line: 'Ships inside @octo-ui/dialog',
  facts: { weeklyDownloads: 98_800_000 },
  starsAtStart: 942,
  starsGained: 12,
};

const call = () => GET();

describe('GET /api/unsung-hero/current', () => {
  beforeEach(() => {
    graphqlDirect.mockReset().mockResolvedValue({ unsungHero: apiHero });
    cacheTag.mockReset();
    cacheLife.mockReset();
  });

  it("answers this week's hero from the read tagged unsung-hero, as the card draws it", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      hero: {
        week: '2026-W47',
        startsAt: '2026-11-16T00:00:00.000Z',
        endsAt: '2026-11-23T00:00:00.000Z',
        repo: { nameWithOwner: 'octo-labs/scroll-guard' },
        package: { registry: 'NPM', name: 'scroll-guard' },
        line: 'Ships inside @octo-ui/dialog',
        weeklyDownloads: 98_800_000,
        usage: { downloads: 98_800_000, downloadsPer: 'week', dependents: null },
        starsAtStart: 942,
        starsGained: 12,
      },
    });
    expect(cacheTag).toHaveBeenCalledWith('unsung-hero');
    // Asked as the site.
    expect(graphqlDirect).toHaveBeenCalledWith(expect.anything());
  });

  it('is kept a minute by a shared cache', async () => {
    expect((await call()).headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });

  it('answers null in a week with no hero', async () => {
    graphqlDirect.mockResolvedValue({ unsungHero: null });
    expect(await (await call()).json()).toEqual({ hero: null });
  });

  it('answers 503, kept by no cache, when the hero cannot be read', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    const response = await call();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
