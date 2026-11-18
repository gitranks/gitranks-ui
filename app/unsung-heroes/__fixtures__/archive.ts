import type { ApiArchive, ApiArchiveHero } from '../archive.documents';

/** A made-up hero: invented repositories and maintainers. */
export const apiHeroOf = (overrides: Partial<ApiArchiveHero> = {}): ApiArchiveHero => ({
  startsAt: '2026-11-16T00:00:00.000Z',
  endsAt: '2026-11-23T00:00:00.000Z',
  live: true,
  repo: { nameWithOwner: 'ada-fixture/line-trim-fixture', description: null, createdAt: '2019-01-14T09:00:00.000Z' },
  package: { registry: 'NPM', name: 'line-trim-fixture' },
  maintainer: { login: 'ada-fixture', name: 'Ada Fixture' },
  line: 'Ships inside @fixture-ui/editor',
  text: 'Trims trailing whitespace from every line. It ships inside @fixture-ui/editor, so it is probably in your app too.',
  facts: { weeklyDownloads: 98_800_000, contributors: 16 },
  starsAtStart: 942,
  starsNow: 990,
  starsGained: 48,
  ...overrides,
});

const pastOf = (
  nameWithOwner: string,
  startsAt: string,
  endsAt: string,
  line: string,
  weeklyDownloads: number,
  [starsAtStart, starsGained, starsNow]: [number, number, number],
) =>
  apiHeroOf({
    startsAt,
    endsAt,
    live: false,
    repo: { nameWithOwner, description: null, createdAt: '2020-03-02T00:00:00.000Z' },
    package: { registry: 'NPM', name: nameWithOwner.split('/')[1] },
    maintainer: { login: nameWithOwner.split('/')[0], name: null },
    line,
    text: line,
    facts: { weeklyDownloads, contributors: null },
    starsAtStart,
    starsGained,
    starsNow,
  });

/** The archive with a hero this week and four past ones, newest first. */
export const apiArchive: ApiArchive = {
  live: apiHeroOf(),
  past: [
    pastOf(
      'harbor-fixture/path-norm-fixture',
      '2026-11-09T00:00:00.000Z',
      '2026-11-16T00:00:00.000Z',
      'Normalizes file paths across platforms',
      41_200_000,
      [612, 318, 993],
    ),
    pastOf(
      'lumen-fixture/csv-chunk-fixture',
      '2026-11-02T00:00:00.000Z',
      '2026-11-09T00:00:00.000Z',
      'Splits CSV streams into chunks',
      28_400_000,
      [388, 241, 677],
    ),
    pastOf(
      'tarn-fixture/tz-lite-fixture',
      '2026-10-26T00:00:00.000Z',
      '2026-11-02T00:00:00.000Z',
      'Time zone offsets without the whole database',
      12_700_000,
      [154, 96, 269],
    ),
    pastOf(
      'pebble-fixture/glob-quote-fixture',
      '2026-10-19T00:00:00.000Z',
      '2026-10-26T00:00:00.000Z',
      'Escapes glob characters in file paths',
      9_800_000,
      [271, 133, 430],
    ),
  ],
  totals: { heroes: 5, starsGained: 788, weeklyDownloads: 190_900_000, since: '2026-10-19T00:00:00.000Z' },
};
