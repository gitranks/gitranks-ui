import { FC } from 'react';

import { RANK_DESCRIPTIONS } from '@/app/app.consts';

import { RankCardItem, RankCardTotalProfilesRanked, RankCardTotalValue } from './rank-card-item';
import { RankCardProps } from './rank-card.types';

// always 3 rows
export const NotRankedCardContent: FC<RankCardProps> = ({ tierData, rankType, score, login }) => {
  const { rankedCount } = tierData;
  const { notRankedMessage } = RANK_DESCRIPTIONS[rankType];

  return (
    <>
      <RankCardItem>{notRankedMessage}</RankCardItem>
      <RankCardTotalProfilesRanked rankedCount={rankedCount} />
      <RankCardTotalValue score={score} login={login} rankType={rankType} />
    </>
  );
};
