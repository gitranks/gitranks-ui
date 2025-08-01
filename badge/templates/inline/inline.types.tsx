import { GlobalRankByLoginQuery } from '@/types/generated/graphql';
import { RankingType } from '@/types/ranking.types';

export type BadgeInlineProps = {
  rankingType: RankingType;
  data: GlobalRankByLoginQuery['globalRankByLogin'];
};
