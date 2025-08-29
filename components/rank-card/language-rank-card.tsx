import { FC } from 'react';

import { NextTierThreshold } from './next-tier-threshold';
import { NotAvailableCardContent } from './not-available-card-content';
import { NotRankedCardContent } from './not-ranked-card-content';
import { LanguageRankCardProps } from './rank-card.types';
import { RankedCardContent } from './ranked-card-content';
import { TierValue } from './tier-value';
import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../app/profile/[login]/components/profile-card';

export const LanguageRankCard: FC<LanguageRankCardProps> = (props) => {
  const { tierData, rankType, tiers, languageName, languageColor } = props;
  const { notRanked, notAvailable } = tierData;
  const hasData = !notRanked && !notAvailable && tierData.data !== undefined;

  return (
    <ProfileCard className="gap-0">
      <div className="flex">
        <div className="grow">
          <ProfileCardHeader>
            <div className="flex gap-2 items-center">
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: languageColor }} />
              {languageName}
            </div>
          </ProfileCardHeader>
          <TierValue tierData={tierData} tiers={tiers} rankedCount={tierData.rankedCount} rankType={rankType} />
        </div>
        <NextTierThreshold {...props} />
      </div>

      <ProfileCardContent className="mt-4">
        {notAvailable && <NotAvailableCardContent {...props} />}
        {notRanked && <NotRankedCardContent {...props} />}
        {hasData && <RankedCardContent {...props} />}
      </ProfileCardContent>
    </ProfileCard>
  );
};
