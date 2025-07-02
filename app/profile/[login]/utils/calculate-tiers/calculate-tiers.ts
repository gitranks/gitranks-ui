import { Tier } from '@/types/generated/graphql';
import { UserRankProps } from '@/types/ranking.types';

import {
  BestTierResult,
  ProfileTierType,
  ProfileTierWithData,
  RankGlobalType,
  TiersDataType,
} from './calculate-tiers.types';

const BUCKETS: UserRankProps[] = ['s', 'c', 'f'];

/**
 * ─────────────────────────────────────────────────────────────
 *   User-defined type-guard
 *     Returns true only when the narrowed contract is met
 * ─────────────────────────────────────────────────────────────
 */
export function hasTierData(tier: ProfileTierType): tier is ProfileTierWithData {
  return !tier.notAvailable && !tier.notRanked && tier.data !== undefined;
}

/**  a > b  → +,  a = b → 0,  a < b → –  */
function compareTiers(a: Tier, b: Tier): number {
  return a.tier !== b.tier ? a.tier - b.tier : a.level - b.level;
}

function mergeProvisionalTier(normal?: Tier, provisional?: Tier): { data: Tier; isProvisional: boolean } | undefined {
  if (!normal && !provisional) {
    // bucket empty
    return;
  }

  // pick provisional if present, otherwise normal
  const chosen = provisional ?? normal!;

  // *provisionalUsed* is true only if we actually used a provisional value
  // *and* it differs from the normal one (when normal exists)
  const isProvisional =
    provisional !== undefined && // we had a provisional
    (normal === undefined || // …and no normal to compare
      compareTiers(provisional, normal) !== 0); // …or a different normal

  return { data: chosen, isProvisional };
}

function getBestProfileTier(profileTiers: ProfileTierWithData[]): BestTierResult | null {
  if (!profileTiers.length) {
    return null;
  }

  /** find the best candidate(s) */
  let bestGroup = [profileTiers[0]];
  for (let i = 1; i < profileTiers.length; i++) {
    const cmp = compareTiers(profileTiers[i].data, bestGroup[0].data);
    if (cmp > 0) {
      bestGroup = [profileTiers[i]];
    } else if (cmp === 0) {
      bestGroup.push(profileTiers[i]);
    }
  }

  return {
    data: bestGroup[0].data,
    source: bestGroup.map((c) => c.key),
    isProvisional: bestGroup.every((c) => c.isProvisional),
  };
}

const findTier = (
  tiers: NonNullable<TiersDataType>[`${UserRankProps}Tiers`],
  rank?: number | null,
): Tier | undefined => {
  return tiers?.find((tier) => tier.maxRank >= (rank || Number.MAX_SAFE_INTEGER));
};

const getRankingTierData = (propName: UserRankProps, profileRank: RankGlobalType, rankTiers: TiersDataType) => {
  const rankedCount = rankTiers?.[`${propName}Users`] ?? 0;
  if (!rankTiers?.[`${propName}Tiers`]?.length) {
    return { notAvailable: true, rankedCount };
  }

  const tierData = findTier(rankTiers[`${propName}Tiers`], profileRank?.[propName]);
  const provisionalTierData = findTier(rankTiers[`${propName}Tiers`], profileRank?.[`${propName}Provisional`]);

  if (!tierData && !provisionalTierData) {
    return { notRanked: true, rankedCount };
  }

  const { data: tierMerged, isProvisional } = mergeProvisionalTier(tierData, provisionalTierData) || {};

  return {
    data: tierMerged,
    isProvisional,
    dataM: findTier(rankTiers[`${propName}Tiers`], profileRank?.[`${propName}M`]),
    rankedCount,
    key: propName,
  };
};

export const calculateTiers = (profileRank: RankGlobalType, rankTiers: TiersDataType) => {
  const profileTiers = BUCKETS.reduce((acc, propName) => {
    acc[`${propName}Tier`] = getRankingTierData(propName, profileRank, rankTiers);
    return acc;
  }, {} as Record<`${UserRankProps}Tier`, ProfileTierType>);

  const tiersWithData = Object.values(profileTiers).filter(hasTierData) as ProfileTierWithData[];
  const bestTier = getBestProfileTier(tiersWithData);

  return { ...profileTiers, bestTier };
};
