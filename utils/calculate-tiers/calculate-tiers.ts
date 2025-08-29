import { TIER_NAMES } from '@/app/app.consts';
import { Tier } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';

import {
  BestTierResult,
  ProfileTierType,
  ProfileTierWithData,
  RanksType,
  TiersDataType,
} from './calculate-tiers.types';

const BUCKETS: UserRankProp[] = [UserRankProp.s, UserRankProp.c, UserRankProp.f];

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
  tiers: NonNullable<TiersDataType>[`${keyof typeof UserRankProp}Tiers`],
  rank?: number | null,
): Tier | undefined => {
  return tiers?.find((tier) => tier.maxRank >= (rank || Number.MAX_SAFE_INTEGER));
};

export const getRankingTierData = (
  propName: UserRankProp,
  profileRanks: RanksType | undefined,
  rankedCount: number,
  tiers?: Tier[],
): ProfileTierType => {
  if (!tiers?.length) {
    return { notAvailable: true, rankedCount };
  }

  const tierData = findTier(tiers, profileRanks?.[propName]);
  const provisionalTierData = findTier(tiers, profileRanks?.[`${propName}Provisional`]);

  if (!tierData && !provisionalTierData) {
    return { notRanked: true, rankedCount };
  }

  const { data: tierMerged, isProvisional } = mergeProvisionalTier(tierData, provisionalTierData) || {};

  return {
    data: tierMerged,
    isProvisional,
    dataM: findTier(tiers, profileRanks?.[`${propName}M`]),
    rankedCount,
    key: propName,
  };
};

export const calculateTiers = (profileRanks?: RanksType, rankTiers?: TiersDataType) => {
  const profileTiers = BUCKETS.reduce((acc, propName) => {
    acc[`${propName}Tier`] = getRankingTierData(
      propName,
      profileRanks,
      rankTiers?.[`${propName}Users`] ?? 0,
      rankTiers?.[`${propName}Tiers`],
    );
    return acc;
  }, {} as Record<`${keyof typeof UserRankProp}Tier`, ProfileTierType>);

  const tiersWithData = Object.values(profileTiers).filter(hasTierData);
  const bestTier = getBestProfileTier(tiersWithData);

  return { ...profileTiers, bestTier };
};

export const getTierName = (tierData?: ProfileTierType): string => {
  if (!tierData || tierData.notAvailable) {
    return 'N/A';
  }

  if (tierData.notRanked) {
    return 'Not Ranked';
  }

  if (!hasTierData(tierData)) {
    return '';
  }

  return `${TIER_NAMES[tierData.data?.tier - 1]} ${tierData.data?.level}`;
};
