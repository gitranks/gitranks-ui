import { repoTierLabel } from '@/components/repo-tier-chip/repo-tier-chip';
import type { Tier } from '@/types/generated/graphql';

type TierRef = Pick<Tier, 'tier' | 'level'>;
type TableTier = Pick<Tier, 'tier' | 'level' | 'maxRank' | 'minValue'>;

const full = new Intl.NumberFormat('en-US');

/**
 * The line under a repository's tier: at the very top, how many repositories share it ("Top 49 repositories on
 * GitHub"); else the stars still missing to the next bucket ("1,180 stars to Galaxy 1"). `null` when the table is
 * missing or the repository already has the next bucket's stars (the tiers catch up at the next ranking).
 */
export function repoTierGoal(tier: TierRef, stars: number, tiers?: readonly TableTier[] | null): string | null {
  if (!tiers?.length) {
    return null;
  }

  const index = tiers.findIndex((bucket) => bucket.tier === tier.tier && bucket.level === tier.level);
  if (index < 0) {
    return null;
  }
  if (index === 0) {
    return `Top ${full.format(tiers[0].maxRank)} repositories on GitHub`;
  }

  const next = tiers[index - 1];
  const missing = (next.minValue ?? 0) - stars;
  return missing > 0 ? `${full.format(missing)} ${missing === 1 ? 'star' : 'stars'} to ${repoTierLabel(next)}` : null;
}
