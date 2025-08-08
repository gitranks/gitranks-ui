import { TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { FC } from 'react';

import { getPercentileRank } from '@/utils/get-percentile-rank';

import { RankCardItem, RankCardPosition, RankCardTotalValue } from './rank-card-item';
import { RankCardProps } from './rank-card.types';
import { RankDelta } from '../rank-delta/rank-delta';

export const RankedCardContent: FC<RankCardProps> = ({
  tierData,
  rankType,
  rank,
  rankProvisional,
  rankM,
  score,
  login,
}) => {
  const { rankedCount } = tierData;
  const rankToDisplay = (rankProvisional ?? rank) || 0;
  const rankPercentile = getPercentileRank(rankToDisplay, rankedCount);

  return (
    <>
      <RankCardPosition rank={rankToDisplay} rankedCount={rankedCount} />
      {!!rankPercentile && <RankCardItem Icon={Trophy}>Top {rankPercentile}% of all ranked profiles!</RankCardItem>}
      {rankToDisplay !== rankM && (
        <RankCardItem Icon={rankToDisplay > (rankM || 0) ? TrendingDown : TrendingUp}>
          <span>
            This month change: <RankDelta current={rankToDisplay} previous={rankM} className="text-base" />
          </span>
        </RankCardItem>
      )}
      <RankCardTotalValue score={score} login={login} rankType={rankType} />
    </>
  );
};
