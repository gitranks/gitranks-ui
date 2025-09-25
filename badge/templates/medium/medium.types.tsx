import type { GlobalRankByLoginQuery } from '@/types/generated/graphql';
import type { RankingType } from '@/types/ranking.types';
import type { ThemeType } from '@/types/theme.types';

export type BadgeMediumProps = {
  rankingType: RankingType;
  theme: ThemeType;
  data: GlobalRankByLoginQuery['globalRankByLogin'];
};
