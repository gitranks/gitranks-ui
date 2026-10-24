import type { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { AdaptiveModal } from '@/components/adaptive-modal/adaptive-modal';
import { TagProvisional } from '@/components/tag-provisional/tag-provisional';
import { tierTextClass } from '@/components/tier-chip/tier-chip';
import { TiersExplanation } from '@/components/tiers-explanation/tiers-explanation';
import { cn } from '@/lib/utils';
import type { Tier } from '@/types/generated/graphql';
import type { UserRankProp } from '@/types/ranking.types';
import { hasTierData } from '@/utils/calculate-tiers/calculate-tiers';
import type { ProfileTierType } from '@/utils/calculate-tiers/calculate-tiers.types';

type TierValueProps = {
  tierData?: ProfileTierType;
  isProvisional?: boolean;
  className?: string;
  tiers?: Tier[] | null;
  rankedCount?: number;
  rankType: UserRankProp;
  rankingName: string;
};

const getTierName = (tierData?: ProfileTierType): string => {
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

export const TierValue: FC<TierValueProps> = ({ tierData, tiers, rankedCount, rankType, className, rankingName }) => {
  // A named tier is written in its colour; "N/A" and "Not Ranked" stay muted.
  const color = tierData && hasTierData(tierData) ? tierTextClass(tierData.data?.tier) : 'text-muted-foreground';

  return (
    <div className={cn('text-2xl font-semibold tracking-tight flex gap-2 items-center', className)}>
      {!tiers?.length && <span className={color}>{getTierName(tierData)}</span>}
      {!!tiers?.length && (
        <AdaptiveModal
          trigger={
            <button
              type="button"
              className={cn('text-left underline decoration-dotted underline-offset-4 cursor-pointer', color)}
            >
              {getTierName(tierData)}
            </button>
          }
          title={`${rankingName} cut-offs`}
          description={`Below is the detailed breakdown of tiers and levels for the ${rankingName}. It shows the rank range and the minimum score needed to earn each tier and level, based on today’s ${(
            rankedCount || 0
          ).toLocaleString(
            'en-US',
          )} tracked profiles. The minimum score needed to reach each tier or level depends on the specific ranking and is updated weekly on Mondays.`}
        >
          <TiersExplanation tiers={tiers} rankedCount={rankedCount} rankType={rankType} tierData={tierData?.data} />
        </AdaptiveModal>
      )}
      {tierData?.isProvisional && <TagProvisional />}
    </div>
  );
};
