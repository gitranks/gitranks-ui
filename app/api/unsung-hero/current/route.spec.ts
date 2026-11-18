import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMaySeePackages, packagesPublic, graphqlDirect, cacheTag, cacheLife } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  packagesPublic: vi.fn(async () => false),
  graphqlDirect: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheTag, cacheLife }));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages, packagesPublic }));
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

const call = () => GET(new NextRequest('https://gitranks.com/api/unsung-hero/current'));

describe('GET /api/unsung-hero/current', () => {
  beforeEach(() => {
    requestMaySeePackages.mockReset().mockResolvedValue(true);
    packagesPublic.mockReset().mockResolvedValue(false);
    graphqlDirect.mockReset().mockResolvedValue({ unsungHero: apiHero });
    cacheTag.mockReset();
    cacheLife.mockReset();
  });

  it('answers the not-found answer to a visitor the feature is hidden from, reading nothing', async () => {
    requestMaySeePackages.mockResolvedValue(false);
    const response = await call();

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
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
        starsAtStart: 942,
        starsGained: 12,
      },
    });
    expect(cacheTag).toHaveBeenCalledWith('unsung-hero');
    // Asked as the site: the route decided who may see it.
    expect(graphqlDirect).toHaveBeenCalledWith(expect.anything());
  });

  it('is never kept by a shared cache while the feature is open to some visitors only', async () => {
    expect((await call()).headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('is kept a minute by a shared cache once the feature is open to everyone', async () => {
    packagesPublic.mockResolvedValue(true);
    expect((await call()).headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });

  it('answers null in a week with no hero', async () => {
    graphqlDirect.mockResolvedValue({ unsungHero: null });
    expect(await (await call()).json()).toEqual({ hero: null });
  });

  it('answers 503, kept by no cache, when the hero cannot be read', async () => {
    packagesPublic.mockResolvedValue(true);
    graphqlDirect.mockRejectedValue(new Error('down'));
    const response = await call();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
