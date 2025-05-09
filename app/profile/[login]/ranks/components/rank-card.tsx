import { Star, TrendingUp, Trophy } from 'lucide-react';
import { FC } from 'react';

import { RankDelta } from '@/components/rank-delta/rank-delta';
import { getPercentileRank } from '@/utils/get-percentile-rank';

import { RankCardItem } from './rank-card-item';
import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../components/profile-card';

type RankCardProps = {
  rank?: number | null;
  rankM?: number | null;
  rankY?: number | null;
  title: string;
  entityValue?: number | null;
  entityName: string;
  description: string;
};

export const RankCard: FC<RankCardProps> = ({ rank, rankM, rankY, title, entityValue, entityName, description }) => {
  const rankPercentile = getPercentileRank(rank);

  return (
    <ProfileCard>
      <ProfileCardHeader>{title}</ProfileCardHeader>
      <ProfileCardContent>
        <h2 className="text-3xl font-semibold mb-4">#{rank?.toLocaleString('en-US')}</h2>
        {!!rankPercentile && (
          <RankCardItem Icon={Trophy}>You&apos;re in the top {rankPercentile}% of all users!</RankCardItem>
        )}
        {(rank !== rankM || rank !== rankY) && (
          <RankCardItem Icon={TrendingUp}>
            <span>
              Trend:{' '}
              {rank !== rankM && (
                <>
                  <RankDelta current={rank} previous={rankM} className="text-base" /> this month;
                </>
              )}{' '}
              {rank !== rankY && (
                <>
                  <RankDelta current={rank} previous={rankY} className="text-base" /> this year
                </>
              )}
            </span>
          </RankCardItem>
        )}
        <RankCardItem Icon={Star}>
          Total {entityName}: {entityValue?.toLocaleString('en-US')}
        </RankCardItem>
        <RankCardItem className="text-xs mt-2 text-muted-foreground">{description}</RankCardItem>
      </ProfileCardContent>
    </ProfileCard>
  );
};
