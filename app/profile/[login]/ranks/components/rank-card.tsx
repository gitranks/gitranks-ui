import { Star, TrendingUp, Trophy } from 'lucide-react';
import { FC } from 'react';

import { RankDelta } from '@/components/rank-delta/rank-delta';
import { RankNumber } from '@/components/rank-number/rank-number';
import { getPercentileRank } from '@/utils/get-percentile-rank';

import { RankCardItem } from './rank-card-item';
import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../components/profile-card';

type RankCardProps = {
  rank?: number | null;
  rankM?: number | null;
  rankProvisional?: number | null;
  showDelta?: boolean;
  title: string;
  entityValue?: number | null;
  entityName: string;
  description: string;
  usersCount?: number;
};

export const RankCard: FC<RankCardProps> = ({
  rank,
  rankProvisional,
  rankM,
  title,
  entityValue,
  entityName,
  showDelta,
  description,
  usersCount,
}) => {
  const rankPercentile = getPercentileRank(rankProvisional ?? rank, usersCount);

  return (
    <ProfileCard>
      <ProfileCardHeader>{title}</ProfileCardHeader>
      <ProfileCardContent>
        <h2 className="text-3xl font-semibold mb-4 flex">
          #<RankNumber rank={rank} rankProvisional={rankProvisional} showDelta={false} className="items-start" />
        </h2>
        {!!rankPercentile && (
          <RankCardItem Icon={Trophy}>You&apos;re in the top {rankPercentile}% of all users!</RankCardItem>
        )}
        {rank !== rankM && showDelta !== false && (
          <RankCardItem Icon={TrendingUp}>
            <span>
              Trend:{' '}
              {rank !== rankM && (
                <>
                  <RankDelta current={rank} previous={rankM} className="text-base" /> this month;
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
