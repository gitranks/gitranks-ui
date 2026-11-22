import { ITEMS_PER_PAGE } from '@/app/app.consts';
import {
  apiRegistryOf,
  DEFAULT_REGISTRY,
  type DownloadsUnit,
  isRegistryId,
  REGISTRIES,
  type RegistryId,
  registryHasDownloads,
  registryOf,
} from '@/lib/packages/registries';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { PackageRankingType } from '@/types/generated/graphql';

/** The stars a repository needs for its use of a package to count. */
export const DEPENDENT_MIN_STARS = 100;

/**
 * The registry a package ranking's URL names: its name in URLs, as the API names it and as written; null for one no
 * ranking is drawn for (exact, letter case included).
 */
export function packageRankingRegistryOf(registry: string) {
  return isRegistryId(registry)
    ? { id: registry, registry: apiRegistryOf(registry), label: REGISTRIES[registry].label }
    : null;
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
    basis: `Rank is based on ${REGISTRIES[DEFAULT_REGISTRY].label} downloads over 7 days.`,
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

/** The downloads ranking of a registry counted a month at a time: by the month just ended, against the one before. */
const MONTHLY_DOWNLOADS: PackageRanking = {
  ...PACKAGE_RANKINGS.downloads,
  basis: 'Rank is based on downloads in the last whole month.',
  rankedBy: 'monthly downloads',
  metric: 'Monthly downloads',
  change: 'vs the month before',
  metricInSentence: 'monthly downloads',
};

/** A ranking as a registry's pages say it: its downloads ranking in the registry's own unit. */
export const packageRankingOf = (
  order: PackageRankingOrder,
  registry: RegistryId = DEFAULT_REGISTRY,
): PackageRanking =>
  order === 'downloads' && registryOf(registry).downloads === 'month' ? MONTHLY_DOWNLOADS : PACKAGE_RANKINGS[order];

export const PACKAGE_RANKING_ORDER_LIST = Object.keys(PACKAGE_RANKINGS) as PackageRankingOrder[];

export function isPackageRankingOrder(value: string): value is PackageRankingOrder {
  return Object.hasOwn(PACKAGE_RANKINGS, value);
}

/** The rankings a registry has, in the menu's order: Downloads only where the registry counts downloads. */
export const packageRankingOrdersOf = (registry: RegistryId): PackageRankingOrder[] =>
  PACKAGE_RANKING_ORDER_LIST.filter((order) => order !== 'downloads' || registryHasDownloads(registry));

/** Whether a registry has this ranking. */
export const isPackageRankingOrderOf = (registry: RegistryId, value: string): value is PackageRankingOrder =>
  isPackageRankingOrder(value) && packageRankingOrdersOf(registry).includes(value);

/** The ranking a registry's rankings open on: Downloads where the registry counts downloads, else Dependents' stars. */
export const packageRankingFirstOrder = (registry: RegistryId = DEFAULT_REGISTRY): PackageRankingOrder =>
  registryHasDownloads(registry) ? 'downloads' : 'dependents-stars';

/** "November 2026" of a day as `formatPackageDate` writes it ("November 30, 2026"); `null` for any other text. */
const monthOfDayText = (day: string) => /^([A-Z][a-z]+) \d{1,2}, (\d{4})$/.exec(day)?.slice(1).join(' ') ?? null;

/**
 * The downloads ranking's period, by its last day as the ranks' read gives it: "in the 7 days to November 15, 2026",
 * or for a registry counted a month at a time, the month: "in October 2026". With no such day, no date at all: one is
 * never worked out from the calendar.
 */
export function downloadsWindow(downloadsTo: string | null | undefined, unit: DownloadsUnit = 'week') {
  if (unit === 'month') {
    const month = downloadsTo ? monthOfDayText(downloadsTo) : null;
    return month ? `in ${month}` : 'in the last whole month';
  }
  return downloadsTo ? `in the 7 days to ${downloadsTo}` : 'over 7 days';
}

/** What a ranking's rank is based on, as its header says it; the downloads ranking with its period's last day. */
export function packageRankingBasis(
  order: PackageRankingOrder,
  downloadsTo?: string | null,
  registry: RegistryId = DEFAULT_REGISTRY,
) {
  const { label, downloads } = REGISTRIES[registry];
  return order === 'downloads'
    ? `Rank is based on ${label} downloads ${downloadsWindow(downloadsTo, downloads ?? undefined)}.`
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

/** The ranking page a rank is listed on; the first page past the pages the rankings list. */
export function packageRankingPageOf(rank: number) {
  const page = Math.ceil(rank / ITEMS_PER_PAGE);
  return page <= RANKING_MAX_PAGE.package ? page : 1;
}
