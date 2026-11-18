import type { PackageDependent, PackageDownloadsPoint, PackagePage } from '@/graphql/package-page';
import { DailyUpdateReason } from '@/types/generated/graphql';

const WEEK = 7 * 86_400_000;

/** 104 weekly points ending with the week of Nov 9, 2026, each 1,000 more than the one before, from 100,000. */
export const weeks: PackageDownloadsPoint[] = Array.from({ length: 104 }, (_, i) => ({
  start: new Date(Date.parse('2026-11-09T00:00:00Z') - (103 - i) * WEEK).toISOString(),
  downloads: 100_000 + i * 1_000,
}));

/** 25 whole months, Oct 2024 – Oct 2026. */
export const months: PackageDownloadsPoint[] = Array.from({ length: 25 }, (_, i) => ({
  start: new Date(Date.UTC(2024, 9 + i, 1)).toISOString(),
  downloads: 5_000_000 + i * 100_000,
}));

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
    lastWeek: 1_797_999,
    previousWeek: 1_700_000,
    last30Days: 7_000_000,
    previous30Days: 6_800_000,
    last52Weeks: 77_900_000,
    previous52Weeks: 70_000_000,
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
