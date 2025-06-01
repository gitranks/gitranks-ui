import { GlobalRankByLoginQuery } from '@/types/generated/graphql';
import { RankingType } from '@/types/ranking.types';

import { DeltaSentimentType } from '../badge.types';

type RankByTypeResult = { rank?: number; delta?: number; sentiment?: DeltaSentimentType; value?: number | null };

export const getRankByRankingType = (
  data: GlobalRankByLoginQuery['globalRankByLogin'],
  rankingType: RankingType,
): RankByTypeResult => {
  let rank;
  let monthlyRank;
  let value;

  if (!data) {
    return {};
  }

  switch (rankingType) {
    case RankingType.Star:
      rank = data.s || 0;
      monthlyRank = data.sM;
      value = data.user?.s;
      break;
    case RankingType.Contribution:
      rank = data.c || 0;
      monthlyRank = data.cM;
      value = data.user?.c;
      break;
    case RankingType.Follower:
      rank = data.f || 0;
      monthlyRank = data.fM;
      value = data.user?.f;
      break;
  }

  const delta = monthlyRank && rank ? monthlyRank - rank : 0;

  return { rank, value, delta, sentiment: delta > 0 ? 'positive' : 'negative' };
};
