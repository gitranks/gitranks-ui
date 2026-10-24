export type RankCardTier = { tier: number; level: number };

/** One global ranking of a profile. `previous` is the position a month ago. */
export type RankCardEntry = {
  position: number | null;
  previous: number | null;
  value: number | null;
  rankedCount: number | null;
  tier: RankCardTier | null;
};

export type RankingKey = 's' | 'c' | 'f';

export type RankCardData = {
  login: string;
  name?: string | null;
  avatarUrl: string | null;
  location?: string | null;
  flag?: string | null;
  rankings: Partial<Record<RankingKey, RankCardEntry>>;
};
