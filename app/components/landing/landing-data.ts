import { cacheLife } from 'next/cache';

import { fetchInsightsServer } from '@/graphql/helpers/fetch-insights-server';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
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
