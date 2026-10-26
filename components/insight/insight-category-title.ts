import { InsightCategory } from '@/types/generated/graphql';

export const InsightCategoryTitle: Record<InsightCategory, string> = {
  [InsightCategory.CountryTrends]: 'Country Trends',
  [InsightCategory.LanguageTrends]: 'Language Trends',
  [InsightCategory.CountryAnalysis]: 'Country Analysis',
  [InsightCategory.LanguageAnalysis]: 'Language Analysis',
  [InsightCategory.ProfileScoreChange]: 'Profile Score Change',
  [InsightCategory.OrgScoreChange]: 'Org Score Change',
  [InsightCategory.TopStarGainers]: 'Top Star Gainer',
  [InsightCategory.ScoreMilestone]: 'Score Milestone',
  [InsightCategory.StarBurst]: 'Star Burst',
  [InsightCategory.RisingRepos]: 'Rising Repositories',
  [InsightCategory.Top_100Climber]: 'Top 100 Climber',
  [InsightCategory.MonthInNumbers]: 'Month in Numbers',
  [InsightCategory.RepoAnniversary]: 'Repository Anniversary',
};
