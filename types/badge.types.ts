export enum RankContext {
  Global = 'global',
  Country = 'country',
}

export enum RankType {
  Score = 'score',
  Position = 'position',
  Tier = 'tier',
  Percentile = 'percentile',
}

export enum RankMeta {
  None = 'none',
  MonthlyChange = 'monthly-change',
  Percentile = 'percentile',
  GoalNextTier = 'goal-next-tier',
  GoalTop1 = 'goal-top-1',
  GoalTop10 = 'goal-top-10',
  GoalTop25 = 'goal-top-25',
}
