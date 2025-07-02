import { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { TagProvisional } from '@/components/tag-provisional/tag-provisional';
import { cn } from '@/lib/utils';

import { hasTierData } from '../utils/calculate-tiers/calculate-tiers';
import { ProfileTierType } from '../utils/calculate-tiers/calculate-tiers.types';

type TierValueProps = {
  tierData?: ProfileTierType;
  isProvisional?: boolean;
  className?: string;
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

export const TierValue: FC<TierValueProps> = ({ tierData, className }) => {
  return (
    <div className={cn('text-2xl font-semibold flex gap-2 items-center', className)}>
      <span>{getTierName(tierData)}</span>
      {tierData?.isProvisional && <TagProvisional />}
    </div>
  );
};
