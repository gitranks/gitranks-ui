import { FC } from 'react';

import { RANK_DESCRIPTIONS } from '@/app/app.consts';

import { NextTierThreshold } from './next-tier-threshold';
import { NotAvailableCardContent } from './not-available-card-content';
import { NotRankedCardContent } from './not-ranked-card-content';
import { RankCardItem } from './rank-card-item';
import { RankCardProps } from './rank-card.types';
import { RankedCardContent } from './ranked-card-content';
import { TierValue } from './tier-value';
import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../app/profile/[login]/components/profile-card';

export const RankCard: FC<RankCardProps> = (props) => {
  const { tierData, rankType, tiers } = props;
  const { title, descriptionProfile } = RANK_DESCRIPTIONS[rankType];
  const { notRanked, notAvailable } = tierData;
  const hasData = !notRanked && !notAvailable && tierData.data !== undefined;

  return (
    <ProfileCard className="gap-0">
      <div className="flex">
        <div className="grow">
          <ProfileCardHeader>{title}</ProfileCardHeader>
          <TierValue tierData={tierData} tiers={tiers} rankedCount={tierData.rankedCount} rankType={rankType} />
        </div>
        <NextTierThreshold {...props} />
      </div>

      <ProfileCardContent className="mt-4">
        {notAvailable && <NotAvailableCardContent {...props} />}
        {notRanked && <NotRankedCardContent {...props} />}
        {hasData && <RankedCardContent {...props} />}
        <RankCardItem className="text-xs text-muted-foreground mt-auto">{descriptionProfile}</RankCardItem>
      </ProfileCardContent>
    </ProfileCard>
  );
};
