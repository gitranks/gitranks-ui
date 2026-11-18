import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { availabilityOf, availableBadges, badgesOf } from './catalogue';
import type { EntityFacts, PackageFacts } from './facts';
import { getEntityFactsResponse } from './facts-route';
import { NOW, packageBig, packageNew, packageUnread } from './fixtures';
import { formatCount } from './format';
import { badgeImagePath, socialCardPath } from './links';
import { toPackageFacts } from './load';
import { resolveParams } from './params';
import { promotedBadges } from './promotion';
import { renderBadge } from './render';
import { BADGE_CACHE_HEADERS, type BadgeLoaders, getBadgeResponse, parsePackageRef } from './route';
import { shieldContent } from './shields';
import { badgeAlt, badgeTiles } from './tiles';
import { BadgesCard } from '@/components/badges-card/badges-card';

// Avatars are never fetched here, and the reads are never made: the mappers and the drawing are pure.
vi.mock('./avatars', () => ({
  fetchAvatar: async () => null,
  fetchAvatars: async (urls: unknown[]) => urls.map(() => null),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const shieldText = (pkg: PackageFacts, id: string, query = '') => {
  const badge = badgesOf('package').find((each) => each.id === id)!;
  const content = shieldContent(pkg, badge, resolveParams(badge, new URLSearchParams(query)), NOW);
  if (!content) return null;
  const words = (runs: { text: string }[]) => runs.map(({ text }) => text).join('');
  return `${content.label} · ${words(content.value.runs)}`;
};

const ids = (badges: { id: string }[]) => badges.map(({ id }) => id);

describe('the package catalogue', () => {
  it('has six shields, three cards and a chart', () => {
    const formats = badgesOf('package').map(({ format }) => format);
    expect(formats.filter((format) => format === 'shield')).toHaveLength(6);
    expect(formats.filter((format) => format === 'card')).toHaveLength(3);
    expect(formats.filter((format) => format === 'chart')).toHaveLength(1);
  });

  it('offers every badge for a package used by repositories with 100+ stars, with a year of history', () => {
    expect(ids(availableBadges(packageBig, resolveParams(badgesOf('package')[0], {}), NOW))).toEqual([
      'used-by',
      'dependents-stars',
      'downloads',
      'downloads-year',
      'downloads-growth',
      'downloads-per-star',
      'used-by-card',
      'downloads-card',
      'package-card',
      'used-by-chart',
    ]);
  });

  it('says "new" for the dependents of a package nobody with 100+ stars uses yet, never 0', () => {
    const params = resolveParams(badgesOf('package')[0], {});
    for (const id of ['used-by', 'dependents-stars', 'used-by-card', 'used-by-chart']) {
      expect(availabilityOf(packageNew, id, params, NOW), id).toBe('neutral');
    }
    expect(shieldText(packageNew, 'used-by')).toBe('used by · new');
    expect(shieldText(packageNew, 'dependents-stars')).toBe('used by · new');
  });

  it('never offers year over year without the year before, nor per star without a repository', () => {
    const params = resolveParams(badgesOf('package')[0], {});
    expect(availabilityOf(packageNew, 'downloads-growth', params, NOW)).toBe('never');
    expect(availabilityOf(packageNew, 'downloads-per-star', params, NOW)).toBe('never');
    expect(shieldText(packageNew, 'downloads-growth')).toBeNull();
    expect(shieldText(packageNew, 'downloads-per-star')).toBeNull();
    expect(ids(availableBadges(packageNew, params, NOW))).toEqual([
      'downloads',
      'downloads-year',
      'downloads-card',
      'package-card',
    ]);
  });

  it('keeps the downloads shields with a dash until the downloads are read', () => {
    const params = resolveParams(badgesOf('package')[0], {});
    expect(availabilityOf(packageUnread, 'downloads', params, NOW)).toBe('neutral');
    expect(shieldText(packageUnread, 'downloads')).toBe('npm downloads · –');
    expect(availabilityOf(packageUnread, 'downloads-card', params, NOW)).toBe('never');
    expect(ids(availableBadges(packageUnread, params, NOW))).toEqual(['package-card']);
  });
});

describe('package shields', () => {
  it('say what the board says', () => {
    expect(shieldText(packageBig, 'used-by')).toBe('used by · 16 repos with 100+ stars');
    expect(shieldText(packageBig, 'dependents-stars')).toBe('used by · 16.4k ★ across 16 repos');
    expect(shieldText(packageBig, 'downloads')).toBe('npm downloads · 1.8M a week');
    expect(shieldText(packageBig, 'downloads-year')).toMatch(/^npm downloads · 7\d\.\dM last 12 months$/);
    expect(shieldText(packageBig, 'downloads-growth')).toBe('downloads · +18% year over year');
    expect(shieldText(packageBig, 'downloads-per-star')).toBe('per star · 1,380 weekly downloads');
  });

  it('say one repo, a fall, and per star below 10 with a decimal', () => {
    const one: PackageFacts = { ...packageBig, dependentsCount: 1, dependentsStars: 812 };
    expect(shieldText(one, 'used-by')).toBe('used by · 1 repo with 100+ stars');
    expect(shieldText(one, 'dependents-stars')).toBe('used by · 812 ★ across 1 repo');
    const fall: PackageFacts = {
      ...packageBig,
      downloads: { ...packageBig.downloads!, last52Weeks: 97, previous52Weeks: 100, perStar: 2.44 },
    };
    expect(shieldText(fall, 'downloads-growth')).toBe('downloads · −3% year over year');
    expect(shieldText(fall, 'downloads-per-star')).toBe('per star · 2.4 weekly downloads');
  });

  it('count repositories exactly under 1,000 and compactly from 1,000', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1_000)).toBe('1k');
    expect(formatCount(1_249)).toBe('1.2k');
    expect(shieldText({ ...packageBig, dependentsCount: 999 }, 'used-by')).toBe('used by · 999 repos with 100+ stars');
    expect(shieldText({ ...packageBig, dependentsCount: 1_000 }, 'used-by')).toBe('used by · 1k repos with 100+ stars');
  });

  it('take a label of their own', () => {
    expect(shieldText(packageBig, 'used-by', 'label=dependents')).toBe('dependents · 16 repos with 100+ stars');
  });
});

const SCHEMES = [
  'scheme=auto&theme=light',
  'scheme=auto&theme=dark',
  'scheme=night',
  'scheme=violet',
  'scheme=classic',
];

describe('package images', () => {
  const sizeOf = (svg: string) => {
    const open = /^<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
    const read = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(open)?.[1] ?? 0);
    return { width: read('width'), height: read('height') };
  };

  it.each(badgesOf('package').map((badge) => [badge.id, badge] as const))(
    '%s draws in light and dark, in every fixed scheme and without the logo',
    async (_, badge) => {
      for (const entity of [packageBig, packageNew]) {
        const queries = [
          ...SCHEMES,
          'logo=0',
          ...(badge.format === 'shield' ? ['scheme=custom&left=%23111111&right=%23eeeeee'] : []),
        ];
        for (const query of queries) {
          const { body, state } = await renderBadge(
            entity,
            badge,
            resolveParams(badge, new URLSearchParams(query)),
            'svg',
            NOW,
          );
          const svg = body as string;
          const available = availabilityOf(entity, badge.id, resolveParams(badge, {}), NOW) !== 'never';
          expect(state, `${entity.name} ${query}`).toBe(available ? 'badge' : 'not-yet');
          expect(svg).not.toContain('<text');
          if (badge.format === 'shield') expect(sizeOf(svg).height).toBe(20);
          else expect(sizeOf(svg)).toEqual(badge.size);
        }
      }
    },
  );

  it('draws an Auto SVG with both themes, and the package card for link previews at 1200×630', async () => {
    const used = badgesOf('package').find(({ id }) => id === 'used-by')!;
    const auto = await renderBadge(packageBig, used, resolveParams(used, {}), 'svg', NOW);
    expect(auto.body).toContain('prefers-color-scheme');

    const card = badgesOf('package').find(({ id }) => id === 'package-card')!;
    const social = await renderBadge(packageBig, card, resolveParams(card, { size: 'social' }), 'svg', NOW);
    expect(sizeOf(social.body as string)).toEqual({ width: 1200, height: 630 });
    expect(socialCardPath({ kind: 'package', registry: 'npm', name: 'react' })).toBe(
      '/badge/package/npm/react/package-card.png?size=social',
    );
  });
});

describe('package badge paths', () => {
  it("keep a scope's @ as it is", () => {
    expect(badgeImagePath({ kind: 'package', registry: 'npm', name: '@types/node' }, 'used-by', 'svg')).toBe(
      '/badge/package/npm/@types/node/used-by.svg',
    );
    expect(badgeImagePath({ kind: 'package', registry: 'npm', name: 'lodash.merge' }, 'downloads', 'png')).toBe(
      '/badge/package/npm/lodash.merge/downloads.png',
    );
  });

  it('name a package by its registry and its one or two parts, and say whether they were spelled as its badges', () => {
    expect(parsePackageRef('npm', ['react'], '/badge/package/npm/react/used-by.svg')).toEqual({
      kind: 'package',
      registry: 'npm',
      name: 'react',
      canonical: true,
    });
    expect(parsePackageRef('npm', ['@types', 'node'], '/badge/package/npm/%40types/node/used-by.svg')).toMatchObject({
      name: '@types/node',
      canonical: false,
    });
    expect(parsePackageRef('npm', ['@types', 'node'], '/badge/package/npm/@types/node/used-by.svg')).toMatchObject({
      canonical: true,
    });
    expect(parsePackageRef('npm', ['@types/node'], '/badge/package/npm/@types%2Fnode/used-by.svg')).toMatchObject({
      name: '@types/node',
      canonical: false,
    });
    expect(parsePackageRef('pypi', ['react'])).toBeNull();
    expect(parsePackageRef('npm', ['types', 'node'])).toBeNull();
    expect(parsePackageRef('npm', ['a', 'b', 'c'])).toBeNull();
    expect(parsePackageRef('npm', ['.hidden'])).toBeNull();
  });
});

const loadersOf = (pkg: EntityFacts | null | Error): BadgeLoaders => ({
  user: async () => null,
  org: async () => null,
  repo: async () => null,
  package: async () => {
    if (pkg instanceof Error) throw pkg;
    return pkg;
  },
});

const answer = (name: string[], file: string, spelled: string, loaders: BadgeLoaders, query = '') =>
  getBadgeResponse(parsePackageRef('npm', name, spelled), file, new URLSearchParams(query), loaders, NOW);

describe('getBadgeResponse for a package', () => {
  it('draws the image with the badge cache rules, and reports it by `npm/<name>`', async () => {
    const onImageServed = vi.fn();
    const response = await answer(
      ['react-resize-detector'],
      'used-by.svg',
      '/badge/package/npm/react-resize-detector/used-by.svg',
      { ...loadersOf(packageBig), onImageServed },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toMatch(/^image\/svg\+xml/);
    expect(response.headers.get('Cache-Control')).toBe(BADGE_CACHE_HEADERS.badge['Cache-Control']);
    expect(onImageServed).toHaveBeenCalledWith('package', 'npm/react-resize-detector');
  });

  it('sends `%40scope` to `@scope` and another spelling to the registry one, with the query', async () => {
    const scoped = { ...packageNew, name: '@nebula/ui' };
    const escaped = await answer(
      ['@nebula', 'ui'],
      'downloads.svg',
      '/badge/package/npm/%40nebula/ui/downloads.svg',
      loadersOf(scoped),
      'scheme=night',
    );
    expect(escaped.status).toBe(308);
    expect(escaped.headers.get('Location')).toBe('/badge/package/npm/@nebula/ui/downloads.svg?scheme=night');

    const cased = await answer(
      ['React-Resize-Detector'],
      'used-by.svg',
      '/badge/package/npm/React-Resize-Detector/used-by.svg',
      loadersOf(packageBig),
    );
    expect(cased.status).toBe(308);
    expect(cased.headers.get('Location')).toBe('/badge/package/npm/react-resize-detector/used-by.svg');
  });

  it('answers not found for a name nobody has read (no badge, not even "new"), a badge of another kind, or no loader', async () => {
    expect(
      (await answer(['fresh'], 'used-by.svg', '/badge/package/npm/fresh/used-by.svg', loadersOf(null))).status,
    ).toBe(404);
    expect(
      (
        await answer(
          ['react-resize-detector'],
          'rank.svg',
          '/badge/package/npm/react-resize-detector/rank.svg',
          loadersOf(packageBig),
        )
      ).status,
    ).toBe(404);
    const noLoader = { ...loadersOf(packageBig), package: undefined };
    expect(
      (
        await answer(
          ['react-resize-detector'],
          'used-by.svg',
          '/badge/package/npm/react-resize-detector/used-by.svg',
          noLoader,
        )
      ).status,
    ).toBe(404);
  });

  it('answers the short-cached 503 while package data cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await answer(
      ['react'],
      'used-by.svg',
      '/badge/package/npm/react/used-by.svg',
      loadersOf(new Error('down')),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe(BADGE_CACHE_HEADERS.unavailable['Cache-Control']);
  });

  it('draws "not yet" for a badge that never applied', async () => {
    const response = await answer(
      ['@nebula', 'ui'],
      'downloads-growth.svg',
      '/badge/package/npm/@nebula/ui/downloads-growth.svg',
      loadersOf(packageNew),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(BADGE_CACHE_HEADERS.provisional['Cache-Control']);
  });
});

describe("a package's builder facts", () => {
  it('are read by `npm/<name>`, a scoped name in two parts', async () => {
    const response = await getEntityFactsResponse('package', ['npm', '@nebula', 'ui'], loadersOf(packageNew));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ kind: 'package', name: '@nebula/ui' });
  });

  it('are not found for a name that cannot be one, another registry, or without a loader', async () => {
    expect((await getEntityFactsResponse('package', ['npm'], loadersOf(packageBig))).status).toBe(404);
    expect((await getEntityFactsResponse('package', ['pypi', 'react'], loadersOf(packageBig))).status).toBe(404);
    expect(
      (await getEntityFactsResponse('package', ['npm', 'react'], { ...loadersOf(packageBig), package: undefined }))
        .status,
    ).toBe(404);
  });
});

describe('toPackageFacts', () => {
  const base = {
    registry: 'NPM' as const,
    name: '@nebula/ui',
    state: 'READ' as const,
    repo: null,
    repositoryName: 'nebula/ui',
    downloads: null,
    dependentsCount: 0,
    dependentsStars: 0,
    dependents: { total: 0, items: [] },
  };

  it('maps a read package', () => {
    expect(toPackageFacts({ package: base })).toEqual({
      kind: 'package',
      registry: 'npm',
      name: '@nebula/ui',
      repo: null,
      repositoryName: 'nebula/ui',
      dependentsCount: 0,
      dependentsStars: 0,
      dependents: [],
      downloads: null,
    });
  });

  it('has no facts for a name not read yet, nor for one the registry does not have', () => {
    expect(toPackageFacts({ package: { ...base, state: 'NOT_READ' } })).toBeNull();
    expect(toPackageFacts({ package: null })).toBeNull();
  });
});

describe("a package's tiles and its Badges card", () => {
  it('promote who uses it, its downloads and their stars', () => {
    expect(ids(promotedBadges(packageBig, NOW))).toEqual(['used-by', 'downloads', 'dependents-stars']);
    expect(ids(promotedBadges(packageNew, NOW))).toEqual(['downloads']);
  });

  it('name the package itself in the alt text, and the builder by `npm/<name>`', () => {
    const [tile] = badgeTiles(packageBig, promotedBadges(packageBig, NOW), NOW);
    expect(tile.src.light).toBe('/badge/package/npm/react-resize-detector/used-by.svg?theme=light');
    expect(tile.alt).toBe('react-resize-detector on GitRanks: used by 16 repos with 100+ stars');
    expect(tile.href).toBe('/badge/builder?package=npm/react-resize-detector&badge=used-by&step=embed');
    const chart = badgesOf('package').find(({ id }) => id === 'used-by-chart')!;
    expect(badgeAlt(packageBig, chart, resolveParams(chart, {}), NOW)).toBe(
      'react-resize-detector on GitRanks: used by 16 repos with 100+ stars',
    );
  });

  it("draw the card: its intro, three shields, the first one's Markdown and every package badge", () => {
    const html = renderToStaticMarkup(<BadgesCard entity={packageBig} now={NOW} />).replaceAll('&amp;', '&');
    expect(html).toContain('<h2>Badge</h2>');
    expect(html).toContain('Show who builds on react-resize-detector in its README.');
    expect(html).toContain('href="/badge/builder?package=npm/react-resize-detector"');
    expect(html).toContain('All package badges');
    expect(html).toContain('/badge/package/npm/react-resize-detector/dependents-stars.svg?theme=dark');
    expect(html).toMatch(
      /\[!\[Used by\]\([^)]*\/badge\/package\/npm\/react-resize-detector\/used-by\.svg\)\]\([^)]*\/package\/npm\/react-resize-detector\)/,
    );
  });

  it("keep a scope's @ in the Markdown", () => {
    const html = renderToStaticMarkup(<BadgesCard entity={packageNew} now={NOW} />);
    expect(html).toContain('/badge/package/npm/@nebula/ui/downloads.svg)](');
    expect(html).toContain('/package/npm/@nebula/ui)');
  });
});
