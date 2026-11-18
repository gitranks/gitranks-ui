import type { PackageDependent, PackageDownloadsPoint, PackagePage } from '@/graphql/package-page';
import { DailyUpdateReason } from '@/types/generated/graphql';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** The week before the last one and the last one, as npm counted them: up 6%. */
const LAST_TWO_WEEKS = [1_700_000, 1_797_999];

/**
 * 104 weekly points ending with the week of Nov 9, 2026: 1,030,000 a week, 6,000 more each week, then the last two.
 * 77.9 million in the last 52 weeks, 61.5 million in the 52 before.
 */
export const weeks: PackageDownloadsPoint[] = Array.from({ length: 104 }, (_, i) => ({
  start: new Date(Date.parse('2026-11-09T00:00:00Z') - (103 - i) * WEEK).toISOString(),
  downloads: LAST_TWO_WEEKS[i - 102] ?? 1_030_000 + i * 6_000,
}));

const sum = (points: readonly PackageDownloadsPoint[]) => points.reduce((total, { downloads }) => total + downloads, 0);

/** Downloads on the days `from` (inclusive) to `to` (exclusive), each day a seventh of its week. */
function downloadsBetween(from: number, to: number): number {
  let total = 0;
  for (const { start, downloads } of weeks) {
    const weekStart = Date.parse(start);
    const days = (Math.min(to, weekStart + WEEK) - Math.max(from, weekStart)) / DAY;
    if (days > 0) total += (downloads * days) / 7;
  }
  return Math.round(total);
}

/** The whole months the weeks cover, from the same days: 23 of them, Dec 2024 – Oct 2026. */
export const months: PackageDownloadsPoint[] = Array.from({ length: 23 }, (_, i) => ({
  start: new Date(Date.UTC(2024, 11 + i, 1)).toISOString(),
  downloads: downloadsBetween(Date.UTC(2024, 11 + i, 1), Date.UTC(2024, 12 + i, 1)),
}));

/** The day after the last week. */
const WEEKS_END = Date.parse('2026-11-16T00:00:00Z');

export const dependentRows: PackageDependent[] = [
  {
    nameWithOwner: 'kiali/kiali',
    ownerAvatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    stars: 3649,
    archived: false,
    manifestPath: 'frontend/package.json',
    versionRange: '^12.3.0',
    manifests: 1,
  },
  {
    nameWithOwner: 'notea-org/notea',
    ownerAvatarUrl: null,
    stars: 2142,
    archived: true,
    manifestPath: 'package.json',
    versionRange: '^6.6.0',
    manifests: 3,
  },
];

/** A package read and ranked, published from a repository this site has a page for. */
export const rankedPackage: PackagePage = {
  registry: 'NPM',
  name: 'react-resize-detector',
  state: 'READ',
  description: 'A Cross-Browser, Event-based, Element Resize Detection for React',
  repo: { nameWithOwner: 'acme/react-resize-detector', stars: 1302 },
  repositoryName: null,
  latestVersion: '12.3.0',
  releaseCount: 125,
  firstPublishedAt: '2015-11-19T00:00:00.000Z',
  maintainers: ['octo-dev', 'mona'],
  maintainersCount: 2,
  license: 'MIT',
  deprecated: null,
  downloadsReadAt: '2026-11-17T00:00:00.000Z',
  dependentsReadAt: '2026-11-16T00:00:00.000Z',
  nextDependentsReadAt: '2026-12-01T00:00:00.000Z',
  refreshedAt: null,
  downloads: {
    through: '2026-11-16T00:00:00.000Z',
    lastWeek: LAST_TWO_WEEKS[1],
    previousWeek: LAST_TWO_WEEKS[0],
    last30Days: downloadsBetween(WEEKS_END - 30 * DAY, WEEKS_END),
    previous30Days: downloadsBetween(WEEKS_END - 60 * DAY, WEEKS_END - 30 * DAY),
    last52Weeks: sum(weeks.slice(52)),
    previous52Weeks: sum(weeks.slice(0, 52)),
    perStar: 1381.1,
    weeks,
    months,
  },
  dependentsCount: 16,
  dependentsStars: 16_429,
  ranks: {
    downloads: { rank: 1_234, previousRank: 1_240 },
    dependentsStars: { rank: 40, previousRank: null },
    dependents: { rank: 230, previousRank: 228 },
  },
  dependents: { total: 16, archived: 1, items: dependentRows },
  dailyUpdates: null,
  refreshRunning: false,
};

/** Read, but no ranking ranks it and no repository with 100+ stars uses it; its repository has no page here. */
export const quietPackage: PackagePage = {
  ...rankedPackage,
  name: '@nebula/ui',
  description: null,
  repo: null,
  repositoryName: 'nebula/ui',
  maintainers: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  maintainersCount: 9,
  downloads: { ...rankedPackage.downloads!, perStar: null, weeks: weeks.slice(-10), months: months.slice(-3) },
  dependentsCount: 0,
  dependentsStars: 0,
  ranks: null,
  dependents: { total: 0, archived: 0, items: [] },
};

/** A valid name nobody has read yet: every other field empty. */
export const notReadPackage: PackagePage = {
  registry: 'NPM',
  name: 'left-pad-next',
  state: 'NOT_READ',
  maintainers: [],
  maintainersCount: 0,
  dependentsCount: 0,
  dependentsStars: 0,
  downloads: null,
  ranks: null,
  dependents: null,
  dailyUpdates: null,
  refreshRunning: false,
};

/** On daily updates, kept on by a badge in its repository's README. */
export const onBadge = { reasons: [DailyUpdateReason.Badge], nextUpdateAt: '2026-11-18T10:00:00.000Z' };
