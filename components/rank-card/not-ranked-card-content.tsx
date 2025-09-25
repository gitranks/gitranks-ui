import type { FC } from 'react';

import { RANK_DESCRIPTIONS } from '@/app/app.consts';
import type { RankCardProps } from './rank-card.types';
import { RankCardItem, RankCardTotalProfilesRanked, RankCardTotalValue } from './rank-card-item';

// always 3 rows
export const NotRankedCardContent: FC<RankCardProps> = ({ tierData, rankType, score, login, rankingLink }) => {
  const { rankedCount } = tierData;
  const { notRankedMessage } = RANK_DESCRIPTIONS[rankType];

  return (
    <>
      <RankCardItem>{notRankedMessage}</RankCardItem>
      <RankCardTotalProfilesRanked rankedCount={rankedCount} rankingLink={rankingLink} />
      <RankCardTotalValue score={score} login={login} rankType={rankType} />
    </>
  );
};
