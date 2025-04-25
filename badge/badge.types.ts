import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

export enum BadgeTemplateType {
  Small = 'small',
  Medium = 'medium',
}

export type DeltaSentimentType = 'positive' | 'negative';
export type BadgeServiceProps = {
  theme: ThemeType;
  login: string;
  rankingType: RankingType;
};
