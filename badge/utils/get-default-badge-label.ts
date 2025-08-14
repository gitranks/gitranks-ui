import { UserRankProps } from '@/types/ranking.types';

export const countryMap: Record<string, string> = {
  'United States': 'US',
  'United Kingdom': 'UK',
  'United Arab Emirates': 'UAE',
};

export const getRankingNameByRankProp = (rankProp: UserRankProps) => {
  switch (rankProp) {
    case 's':
      return 'Stars Rank';
    case 'c':
      return 'Contrib Rank';
    case 'f':
      return 'Followers Rank';
  }
};

export const getDefaultBadgeLabel = (rankProp: UserRankProps, country?: string) => {
  const rankingName = getRankingNameByRankProp(rankProp);

  if (country) {
    const countryName = countryMap[country] ?? country;
    return `${countryName} ${rankingName}`;
  }

  return rankingName;
};
