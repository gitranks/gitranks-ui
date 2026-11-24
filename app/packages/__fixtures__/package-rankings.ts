import type { PackageRankingFactsData, PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';

type Row = PackageRankRows[number];

const row = (
  rank: number,
  previousRank: number | null,
  name: string,
  description: string | null,
  nameWithOwner: string | null,
  value: number,
  change: number | null,
): Row => ({
  rank,
  previousRank,
  name,
  description,
  value,
  change,
  repositoryName: nameWithOwner,
  ownerAvatarUrl: nameWithOwner ? `https://avatars.githubusercontent.com/${nameWithOwner.split('/')[0]}?v=4` : null,
  repo: nameWithOwner ? { nameWithOwner } : null,
});

/** The first rows of the downloads ranking, as the board draws them. */
export const downloadsRanking: PackageRankRows = [
  row(1, 2, 'moss-date', 'Dates without time zones until you need them.', 'mossbyte/moss-date', 5_806_310, -46_450),
  row(2, 3, '@orbit/fetch', 'A fetch wrapper with retries and typed errors.', 'orbit-hq/console', 3_120_664, 53_051),
  row(3, 3, 'kite-router', 'A tiny HTTP router for Bun and Node.', 'harborlabs/kite', 2_410_552, 9_642),
  row(4, 8, 'cobalt-forms', 'Form state for React with schema validation.', 'cobalt-dev/forms', 2_204_118, 57_307),
  row(5, 7, 'lumen-md', 'Markdown and Typst to HTML, the engine behind lumen.', 'lumen-dev/lumen', 1_882_019, 41_404),
  row(
    6,
    11,
    'telemetry-kit',
    'OpenTelemetry helpers for small services.',
    'orbitcraft/telemetry-kit',
    1_203_877,
    61_398,
  ),
  row(7, 7, 'quill-parse', 'A tolerant HTML-to-Markdown parser.', 'quill-app/editor', 1_011_906, 9_107),
  row(8, 5, 'fjord-store', 'A small state store with undo.', 'fjord-labs/fjord', 870_440, -16_538),
  row(9, 7, 'shelf-search', 'Full-text search for small collections.', 'quietpeak/shelf', 640_311, -22_411),
  row(
    10,
    13,
    '@nebula/ui',
    'Accessible React components with a design-token theme engine.',
    'nebula/ui',
    412_880,
    12_799,
  ),
  row(11, 11, 'pixelate', 'Image dithering in the browser.', 'mossbyte/pixelate', 388_120, 0),
  row(12, 11, 'tidepool', null, null, 96_210, -1_155),
];

/** The dependents' stars ranking: a change only once a second read has seen the package. */
export const dependentsStarsRanking: PackageRankRows = [
  row(1, 1, 'moss-date', 'Dates without time zones until you need them.', 'mossbyte/moss-date', 5_902_441, 12_004),
  row(2, null, '@orbit/fetch', 'A fetch wrapper with retries and typed errors.', 'orbit-hq/console', 4_211_098, null),
  row(3, 2, 'kite-router', 'A tiny HTTP router for Bun and Node.', 'harborlabs/kite', 3_906_441.4, -2_310),
];

/** Go's ranking by dependents' stars: module paths, which name their repository. */
export const goDependentsStarsRanking: PackageRankRows = [
  row(
    1,
    1,
    'github.com/mossbyte/moss-date',
    'Dates without time zones until you need them.',
    'mossbyte/moss-date',
    5_902_441,
    12_004,
  ),
  row(
    2,
    null,
    'github.com/orbit-hq/fetch',
    'A fetch wrapper with retries and typed errors.',
    'orbit-hq/fetch',
    4_211_098,
    null,
  ),
  row(3, 2, 'github.com/harborlabs/kite', 'A tiny HTTP router.', 'harborlabs/kite', 3_906_441.4, -2_310),
];

/** The dependents ranking. */
export const dependentsRanking: PackageRankRows = [
  row(1, 1, 'moss-date', 'Dates without time zones until you need them.', 'mossbyte/moss-date', 1_877, 41),
  row(2, 3, 'kite-router', 'A tiny HTTP router for Bun and Node.', 'harborlabs/kite', 1_204, 7),
  row(3, 2, '@orbit/fetch', 'A fetch wrapper with retries and typed errors.', 'orbit-hq/console', 940, null),
];

export const packageRankingFacts: PackageRankingFactsData = {
  ranked: 41_870,
  dependentsReadAt: '2026-11-16T04:12:00.000Z',
  downloadsThrough: '2026-11-15T00:00:00.000Z',
  ranksAt: '2026-11-17T06:00:00.000Z',
};
