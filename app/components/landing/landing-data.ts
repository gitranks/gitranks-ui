import { cacheLife } from 'next/cache';

import { LANDING_PACKAGE_ROWS, type LandingPackages } from './packages-section';
import { formatPackageDate, PACKAGE_RANKINGS, packageRankingOrdersOf } from '@/app/packages/package-rankings';
import { fetchInsightsServer } from '@/graphql/helpers/fetch-insights-server';
import { fetchPackageRankingFacts, fetchPackageRankings } from '@/graphql/helpers/fetch-package-rankings';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { loadLearnCourses } from '@/lib/learn/course.data';
import type { CourseInLine } from '@/lib/learn/courses-line';
import { apiRegistryOf, DEFAULT_REGISTRY } from '@/lib/packages/registries';
import { ContributeOpenDocument } from '@/lib/workspace/contribute.documents';
import {
  BadgeTiersDocument,
  GlobalRankingsDocument,
  OrgRankingsDocument,
  PageOrgDocument,
  RankOrder,
  RepoRankingsDocument,
} from '@/types/generated/graphql';

// Every read here is shared by all visitors and cached on the server, so a landing view never waits
// on the API. The page's own lifetime is the shortest of these (the insights).

// The stock 'hours' profile, spelled out: next.config.ts gives 'hours' a zero lifetime in dev, which
// would turn these reads into uncached holes in the prerendered page.
export const HOURLY = { stale: 300, revalidate: 3_600, expire: 86_400 };

/** The organization whose code facts the landing shows. */
export const FEATURED_ORG = 'vercel';

export const LEADERBOARD_ROWS = 10;
export const TOP_ORGS_ROWS = 5;

/** The newest posts, for the ticker and the insights block. New posts are rare, so 15 minutes is plenty. */
export const fetchLandingInsights = async () => {
  'use cache';
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });

  try {
    const { insights } = await fetchInsightsServer({ skip: 0, limit: 5 });
    return insights ?? [];
  } catch {
    // An optional block: a failed read hides it for a few minutes instead of failing the page.
    cacheLife('minutes');
    return [];
  }
};

/**
 * Learn's live courses for the home page's Learn card, from Learn's own cached list: the slug and name only, in the
 * list's order. A failed read is none for a few minutes (the card keeps its plain line), never a failed page.
 */
export const fetchHomeLearnCourses = async (): Promise<CourseInLine[]> => {
  'use cache';
  cacheLife(HOURLY);

  try {
    const courses = await loadLearnCourses();
    if (!courses.length) cacheLife('minutes');
    return courses.map(({ slug, name }) => ({ slug, name }));
  } catch {
    cacheLife('minutes');
    return [];
  }
};

/** The top of each global ranking. Positions move once a day at most. */
export const fetchLeaderboards = async () => {
  'use cache';
  cacheLife(HOURLY);

  const read = async (order: RankOrder) => {
    const { globalRankings } = (await graphqlDirect(GlobalRankingsDocument, { order, offset: 0 })) ?? {};
    return (globalRankings ?? []).slice(0, LEADERBOARD_ROWS);
  };

  const [s, c, f] = await Promise.all([
    read(RankOrder.Stars),
    read(RankOrder.Contributions),
    read(RankOrder.Followers),
  ]);

  return { s, c, f };
};

/** Tier cut-offs for the global rankings; they change weekly. */
export const fetchGlobalTiers = async () => {
  'use cache';
  cacheLife(HOURLY);

  const { rankTiersByName } = (await graphqlDirect(BadgeTiersDocument, { tiersName: 'global' })) ?? {};

  return rankTiersByName ?? null;
};

export const fetchTopOrgs = async () => {
  'use cache';
  cacheLife(HOURLY);

  const { orgRankings } = (await graphqlDirect(OrgRankingsDocument, { offset: 0 })) ?? {};

  return (orgRankings ?? []).slice(0, TOP_ORGS_ROWS);
};

/** The featured organization's code facts. They are recomputed about once a week. */
export const fetchFeaturedOrg = async () => {
  'use cache';
  cacheLife('days');

  try {
    const { organization } = (await graphqlDirect(PageOrgDocument, { login: FEATURED_ORG })) ?? {};
    return organization?.pulse?.snapshot.length ? organization : null;
  } catch {
    cacheLife('minutes');
    return null;
  }
};

/**
 * The first page of the repository ranking. Empty until repositories are ranked; the landing leaves
 * the block out while it is empty, and a failed read does the same for a few minutes.
 */
export const fetchTopRepos = async () => {
  'use cache';
  cacheLife(HOURLY);

  try {
    const { repoRankings } = (await graphqlDirect(RepoRankingsDocument, { offset: 0 })) ?? {};
    return repoRankings ?? [];
  } catch {
    cacheLife('minutes');
    return [];
  }
};

/**
 * Whether the home page's block draws Contribute's card: once the API says Contribute is launched (`contributeOpen`),
 * since its landing is not found for visitors before. Asked as often as the page's shortest read (15 minutes), so the
 * launch reaches the home page without a deploy and the page lives as long as before; a failed read leaves the card
 * out for a few minutes.
 */
export const fetchContributeForVisitors = async (): Promise<boolean> => {
  'use cache';
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });

  try {
    const { contributeOpen } = await graphqlDirect(ContributeOpenDocument, undefined, { source: 'ssr' });
    return contributeOpen === true;
  } catch {
    cacheLife('minutes');
    return false;
  }
};

/**
 * The top of each package ranking of the default registry, for the home page's package block, with how many packages
 * are ranked and the downloads' last day. Each read is the ranking pages' own cached one, so the block costs no request
 * of its own. A ranking that cannot be read now is left out; with none, null (the block is left out).
 */
export const fetchLandingPackages = async (): Promise<LandingPackages | null> => {
  const registry = apiRegistryOf(DEFAULT_REGISTRY);
  const orders = packageRankingOrdersOf(DEFAULT_REGISTRY);

  const [facts, ...pages] = await Promise.all([
    fetchPackageRankingFacts(registry),
    ...orders.map((order) => fetchPackageRankings({ registry, by: PACKAGE_RANKINGS[order].type, offset: 0 })),
  ]);

  const boards = orders.flatMap((order, index) => {
    const rows = pages[index];
    return rows?.length ? [{ order, rows: rows.slice(0, LANDING_PACKAGE_ROWS) }] : [];
  });

  if (!boards.length) return null;

  return {
    boards,
    ranked: facts?.ranked ?? null,
    downloadsTo: formatPackageDate(facts?.downloadsThrough),
  };
};
