import { GlobalRankByLoginQuery } from '@/types/generated/graphql';
import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

export type BadgeMediumProps = {
  rankingType: RankingType;
  theme: ThemeType;
  data: GlobalRankByLoginQuery['globalRankByLogin'];
};
