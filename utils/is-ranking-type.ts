import { RankingTypeClient } from '@/types/ranking.types';

const RANKING_SET = new Set<string>(Object.values(RankingTypeClient));

export function isRankingType(v: unknown): v is RankingTypeClient {
  return typeof v === 'string' && RANKING_SET.has(v);
}
