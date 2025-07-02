import { Tier } from '@/types/generated/graphql';

type GetNextTierThresholdParams = {
  tiers?: Tier[]; // Optional array of tiers
  currentTier?: Tier | null; // Current tier, can be null if not ranked
  score?: number | null; // Current score of the user
};

export function getNextTierThreshold({ tiers, currentTier, score }: GetNextTierThresholdParams) {
  if (!tiers?.length || !currentTier || score === null || score === undefined) {
    return {};
  }

  const index = tiers.findIndex((t) => t.tier === currentTier?.tier && t.level === currentTier?.level);
  if (!index || index === -1) {
    // Index 0 is the absolute top (tier 7-level 5), so nothing higher exists
    return {};
  }

  // Higher grade is the previous element because the array is descending
  const nextHigher = tiers[index - 1];

  // Positive gap means more stars needed; 0 means they already qualify
  const threshold = Math.max(0, nextHigher.minValue - score);

  return { threshold, nextTier: nextHigher };
}
