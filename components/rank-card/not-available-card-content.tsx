import { FC } from 'react';

import { NOT_AVAILABLE } from '@/app/app.consts';

import { RankCardItem, RankCardPosition, RankCardTotalProfilesRanked, RankCardTotalValue } from './rank-card-item';
import { RankCardProps } from './rank-card.types';

// always 3 rows
export const NotAvailableCardContent: FC<RankCardProps> = ({
  tierData,
  rankType,
  rank,
  rankProvisional,
  score,
  login,
  rankingLink,
}) => {
  const { rankedCount } = tierData;
  const rankToDisplay = (rankProvisional ?? rank) || 0;
  const hasRank = rankToDisplay <= rankedCount && rankToDisplay > 0;

  return (
    <>
      <RankCardItem>{NOT_AVAILABLE}</RankCardItem>
      {hasRank && <RankCardPosition rank={rankToDisplay} rankedCount={rankedCount} rankingLink={rankingLink} />}
      {!hasRank && <RankCardTotalProfilesRanked rankedCount={rankedCount} rankingLink={rankingLink} />}
      <RankCardTotalValue score={score} login={login} rankType={rankType} />
    </>
  );
};
