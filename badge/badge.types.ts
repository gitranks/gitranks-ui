export type ThemeType = 'light' | 'dark';

export type BadgeType = 'stars' | 'contributions' | 'followers';

export type BadgeTemplateType = 'small' | 'medium';

export type DeltaSentimentType = 'positive' | 'negative';

export type BadgeServiceProps = {
  theme: ThemeType;
  login: string;
  type: BadgeType;
};
