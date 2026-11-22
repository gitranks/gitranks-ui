import { beforeEach, describe, expect, it, vi } from 'vitest';

import { availabilityOf, availableBadges, badgesOf, findBadge } from './catalogue';
import type { RepoFacts } from './facts';
import { getEntityFactsResponse } from './facts-route';
import { NOW, repoMid } from './fixtures';
import { loadBadgeRepo, toRepoUnsungHero } from './load';
import { resolveParams } from './params';
import { BADGE_CACHE_HEADERS, type BadgeLoaders, getBadgeResponse, parseEntityRef } from './route';
import { notYetShield, shieldContent } from './shields';
import { UNSUNG_HERO_BADGE, unsungHeroMonth } from './unsung-hero-badge';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));

const NAME = 'example-org/example-lib';

/** A repository that was Unsung hero the week of Monday 2 November 2026. */
const hero: RepoFacts = {
  ...repoMid,
  nameWithOwner: NAME,
  unsungHero: { week: '2026-W45', startsAt: '2026-11-02T00:00:00.000Z' },
};
/** A repository that never was. */
const neverHero: RepoFacts = { ...repoMid, nameWithOwner: NAME };

const badge = findBadge('repo', UNSUNG_HERO_BADGE)!;
const params = (query = '') => resolveParams(badge, new URLSearchParams(query));

const loadersOf = (repo: RepoFacts | null) => ({
  user: vi.fn<BadgeLoaders['user']>(async () => null),
  org: vi.fn<BadgeLoaders['org']>(async () => null),
  repo: vi.fn<BadgeLoaders['repo']>(async () => repo),
});

const image = (repo: RepoFacts | null, file = `${UNSUNG_HERO_BADGE}.svg`, query = '') => {
  const loaders = loadersOf(repo);
  const [owner, name] = NAME.split('/');
  return {
    loaders,
    response: getBadgeResponse(parseEntityRef('repo', { owner, name }), file, new URLSearchParams(query), loaders, NOW),
  };
};

const cacheHeaders = (response: Response) => ({
  'Cache-Control': response.headers.get('cache-control'),
  'Cloudflare-CDN-Cache-Control': response.headers.get('cloudflare-cdn-cache-control'),
});

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockReset();
  cacheTag.mockReset();
});

describe('the Unsung hero badge in the catalogue', () => {
  it('is one shield for repositories, with no extra or option to pick', () => {
    expect(badgesOf('repo').filter(({ id }) => id === UNSUNG_HERO_BADGE)).toEqual([
      {
        id: 'unsung-hero',
        entity: 'repo',
        format: 'shield',
        title: 'Unsung hero',
        extras: [],
        defaultExtra: null,
        options: [],
        values: undefined,
      },
    ]);
    for (const kind of ['user', 'org', 'package'] as const) {
      expect(findBadge(kind, UNSUNG_HERO_BADGE)).toBeNull();
    }
  });

  it('is offered for a repository that was a hero, and never for one that was not', () => {
    expect(availabilityOf(hero, UNSUNG_HERO_BADGE, params(), NOW)).toBe('available');
    expect(availableBadges(hero, params(), NOW).map(({ id }) => id)).toContain(UNSUNG_HERO_BADGE);

    expect(availabilityOf(neverHero, UNSUNG_HERO_BADGE, params(), NOW)).toBe('never');
    expect(availableBadges(neverHero, params(), NOW).map(({ id }) => id)).not.toContain(UNSUNG_HERO_BADGE);
  });

  it('reads "GitRanks | Unsung hero · Nov 2026"', () => {
    const content = shieldContent(hero, badge, params(), NOW);
    const text = (segment: { runs: { text: string }[] } | undefined) => segment?.runs.map((run) => run.text).join('');

    expect({ label: content?.label, value: text(content?.value), extra: text(content?.extra) }).toEqual({
      label: 'GitRanks',
      value: 'Unsung hero',
      extra: 'Nov 2026',
    });
    expect(shieldContent(neverHero, badge, params(), NOW)).toBeNull();
    expect(text(notYetShield(badge, params()).value)).toBe('not yet');
  });

  it('names the month the week started, in UTC', () => {
    expect(unsungHeroMonth({ week: '2026-W49', startsAt: '2026-11-30T00:00:00.000Z' })).toBe('Nov 2026');
    expect(unsungHeroMonth({ week: '2027-W01', startsAt: '2027-01-04T00:00:00.000Z' })).toBe('Jan 2027');
  });
});

describe('the Unsung hero badge image', () => {
  it("draws a hero's badge, kept like any badge", async () => {
    const { response } = image(hero);
    const answer = await response;

    expect(answer.status).toBe(200);
    expect(answer.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(cacheHeaders(answer)).toEqual(BADGE_CACHE_HEADERS.badge);
    expect(await answer.text()).toMatch(/^<svg width="[\d.]+" height="20"/);
  });

  it('draws "not yet" for a repository that never was a hero, kept for minutes', async () => {
    const { response } = image(neverHero, `${UNSUNG_HERO_BADGE}.png`);
    const answer = await response;

    expect(answer.status).toBe(200);
    expect(cacheHeaders(answer)).toEqual({ ...BADGE_CACHE_HEADERS.provisional, 'Cloudflare-CDN-Cache-Control': null });
  });
});

describe("the repository's facts", () => {
  it('tell the builder the week of a hero, and nothing about it for any other repository', async () => {
    const facts = async (repo: RepoFacts) =>
      (await getEntityFactsResponse('repo', NAME.split('/'), loadersOf(repo))).json();

    expect(await facts(hero)).toMatchObject({ unsungHero: hero.unsungHero });
    expect(await facts(neverHero)).not.toHaveProperty('unsungHero');
  });

  it("read the hero's week from the API's answer", () => {
    expect(
      toRepoUnsungHero({ repo: { unsungHero: { week: '2026-W45', startsAt: '2026-11-02T00:00:00.000Z' } } }),
    ).toEqual({ week: '2026-W45', startsAt: '2026-11-02T00:00:00.000Z' });
    expect(toRepoUnsungHero({ repo: { unsungHero: null } })).toBeNull();
    expect(toRepoUnsungHero({ repo: null })).toBeNull();
    expect(toRepoUnsungHero({ repo: { unsungHero: { week: '2026-W45', startsAt: 'soon' } } })).toBeNull();
  });

  it('are loaded with the week beside the badge data, and without it when it cannot be read', async () => {
    const repoData = {
      repo: { githubId: 'R_example', nameWithOwner: NAME, language: 'Rust', stars: 812, rank: null },
      repoRankTiers: null,
      repoLanguages: [],
    };
    const week = { week: '2026-W45', startsAt: '2026-11-02T00:00:00.000Z' };
    const isHeroRead = (document: { definitions: { name?: { value: string } }[] }) =>
      document.definitions[0].name?.value === 'BadgeRepoUnsungHero';

    graphqlDirect.mockImplementation(async (document) =>
      isHeroRead(document) ? { repo: { unsungHero: week } } : repoData,
    );
    expect(await loadBadgeRepo('example-org', 'example-lib')).toMatchObject({ nameWithOwner: NAME, unsungHero: week });
    expect(graphqlDirect).toHaveBeenCalledWith(
      expect.anything(),
      { owner: 'example-org', name: 'example-lib' },
      { source: 'badge' },
    );
    // The week is kept apart from the rest, under the heroes' tag, which a change of any hero's week expires.
    expect(cacheTag).toHaveBeenCalledWith('repo:example-org/example-lib', 'unsung-hero');

    graphqlDirect.mockImplementation(async (document) =>
      isHeroRead(document) ? { repo: { unsungHero: null } } : repoData,
    );
    const never = await loadBadgeRepo('example-org', 'example-lib');
    expect(never).toMatchObject({ nameWithOwner: NAME });
    expect(never).not.toHaveProperty('unsungHero');

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    cacheLife.mockReset();
    graphqlDirect.mockImplementation(async (document) => {
      if (isHeroRead(document)) throw new Error('down');
      return repoData;
    });
    const unread = await loadBadgeRepo('example-org', 'example-lib');
    // The other badges still draw; the missing week is kept for minutes, so it shows soon after the API answers again.
    expect(unread).toMatchObject({ nameWithOwner: NAME });
    expect(unread).not.toHaveProperty('unsungHero');
    expect(cacheLife.mock.calls).toEqual(expect.arrayContaining([['minutes'], ['hours']]));
    consoleError.mockRestore();
  });
});
