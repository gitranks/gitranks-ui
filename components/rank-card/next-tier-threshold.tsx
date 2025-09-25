import type { FC } from 'react';

import { RANK_DESCRIPTIONS, TIER_NAMES } from '@/app/app.consts';
import { getNextTierThreshold } from '@/utils/get-next-tier-threshold';
import { pluralize } from '@/utils/pluralize';

import type { NextTierThresholdProps } from './rank-card.types';

export const NextTierThreshold: FC<NextTierThresholdProps> = ({ tiers, tierData, rankType, score }) => {
  const { threshold, nextTier } = getNextTierThreshold({ tiers, currentTier: tierData.data, score });

  if (!threshold || !nextTier) {
    return null; // No next tier or threshold available
  }

  const nextTierName = `${TIER_NAMES[nextTier.tier - 1]} ${nextTier.level}`;
  const { entityName } = RANK_DESCRIPTIONS[rankType];

  return (
    <div className="text-xs text-muted-foreground text-right">
      {threshold.toLocaleString('en-US')} {pluralize(entityName, threshold)}
      <br />
      to reach {nextTierName}
    </div>
  );
};
