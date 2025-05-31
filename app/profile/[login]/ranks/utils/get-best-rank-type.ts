import { RankingType } from '@/types/ranking.types';

export function getBestRankType(params: { s?: number | null; c?: number | null; f?: number | null }): RankingType {
  const { s, c, f } = params;

  if ((s || Infinity) < (c || Infinity) && (s || Infinity) < (f || Infinity)) {
    return RankingType.Star;
  }

  if ((c || Infinity) < (f || Infinity)) {
    return RankingType.Contribution;
  }

  return RankingType.Follower;
}
