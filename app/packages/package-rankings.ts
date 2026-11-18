import { PackageRankingType, PackageRegistry } from '@/types/generated/graphql';

/** The stars a repository needs for its use of a package to count. */
export const DEPENDENT_MIN_STARS = 100;

/** The registries a package ranking is drawn for, by the name in its URL. */
export const PACKAGE_RANKING_REGISTRIES: Readonly<Record<string, { registry: PackageRegistry; label: string }>> = {
  npm: { registry: PackageRegistry.Npm, label: 'npm' },
};

/** The registry a package ranking's URL names, or null for one no ranking is drawn for (exact, letter case included). */
export function packageRankingRegistryOf(registry: string) {
  return Object.hasOwn(PACKAGE_RANKING_REGISTRIES, registry) ? PACKAGE_RANKING_REGISTRIES[registry] : null;
}

/** What a package ranking ranks by, and how its page names it. */
export type PackageRanking = {
  type: PackageRankingType;
  /** Its option in "Rank by", and the end of its title. */
  label: string;
  /** What the rank is based on, as the header says it (the downloads ranking's with no date: see `packageRankingBasis`). */
  basis: string;
  /** What the ranking orders packages by, in running text: "npm packages ranked by …". */
  rankedBy: string;
  /** The metric's column. */
  metric: string;
  /** The change's column. */
  change: string;
  /** The metric, in a sentence: "By weekly downloads, the top three are …". */
  metricInSentence: string;
  /** A package's number, after the number: "5,806,310 downloads"; one, then many. */
  unit: readonly [string, string];
};

/** The three package rankings, by the order's name in their URL. */
export const PACKAGE_RANKINGS = {
  downloads: {
    type: PackageRankingType.Downloads,
    label: 'Downloads',
    basis: 'Rank is based on npm downloads over 7 days.',
    rankedBy: 'weekly downloads',
    metric: 'Weekly downloads',
    change: 'vs last week',
    metricInSentence: 'weekly downloads',
    unit: ['download', 'downloads'],
  },
  'dependents-stars': {
    type: PackageRankingType.DependentsStars,
    label: "Dependents' stars",
    basis: `Rank is based on the stars of every repository with ${DEPENDENT_MIN_STARS}+ stars that uses the package directly, added up.`,
    rankedBy: `the stars of the repositories with ${DEPENDENT_MIN_STARS}+ stars that use them`,
    metric: "Dependents' stars",
    change: 'This month',
    metricInSentence: "dependents' stars",
    unit: ['star between the repositories that use it', 'stars between the repositories that use it'],
  },
  dependents: {
    type: PackageRankingType.Dependents,
    label: 'Dependents',
    basis: `Rank is based on how many repositories with ${DEPENDENT_MIN_STARS}+ stars use the package directly.`,
    rankedBy: `how many repositories with ${DEPENDENT_MIN_STARS}+ stars use them`,
    metric: 'Used by',
    change: 'New this month',
    metricInSentence: 'dependents',
    unit: [
      `repository with ${DEPENDENT_MIN_STARS}+ stars using it`,
      `repositories with ${DEPENDENT_MIN_STARS}+ stars using it`,
    ],
  },
} as const satisfies Record<string, PackageRanking>;

export type PackageRankingOrder = keyof typeof PACKAGE_RANKINGS;

export const PACKAGE_RANKING_ORDER_LIST = Object.keys(PACKAGE_RANKINGS) as PackageRankingOrder[];

export function isPackageRankingOrder(value: string): value is PackageRankingOrder {
  return Object.hasOwn(PACKAGE_RANKINGS, value);
}

/**
 * The downloads ranking's 7 days, by their last day as the ranks' read gives it: "in the 7 days to November 15, 2026".
 * With no such day, no date at all: one is never worked out from the calendar.
 */
export function downloadsWindow(downloadsTo: string | null | undefined) {
  return downloadsTo ? `in the 7 days to ${downloadsTo}` : 'over 7 days';
}

/** What a ranking's rank is based on, as its header says it; the downloads ranking with its 7 days' last day. */
export function packageRankingBasis(order: PackageRankingOrder, downloadsTo?: string | null) {
  return order === 'downloads'
    ? `Rank is based on npm downloads ${downloadsWindow(downloadsTo)}.`
    : PACKAGE_RANKINGS[order].basis;
}

/** "npm Package Ranking by Downloads". */
export function packageRankingTitle(registryLabel: string, order: PackageRankingOrder) {
  return `${registryLabel} Package Ranking by ${PACKAGE_RANKINGS[order].label}`;
}

/** A count or a sum, whole, with en-US separators. */
export const formatPackageCount = (value: number) => Math.round(value).toLocaleString('en-US');

/** A change with its sign: `+53,051`, `−46,450` (a true minus), `0`. */
export function formatPackageChange(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toLocaleString('en-US')}`;
}

/** A read's or a ranking's date, `November 16, 2026`, in UTC; null when it does not parse. */
const DATE = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatPackageDate(value: unknown): string | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
}
