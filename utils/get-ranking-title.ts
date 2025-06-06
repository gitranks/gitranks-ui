import { RankingTypeClient } from '@/types/ranking.types';

export function getRankingTitle(rankingType: RankingTypeClient, countryName?: string) {
  let title: string;
  let subtitle: string;

  const prefix = countryName ? `${countryName} ` : '';

  switch (rankingType) {
    case RankingTypeClient.Contribution:
      title = `${prefix}Contribution Ranking`;
      subtitle = 'Ranks use stars from repos a developer contributed to — excluding their own repos.';
      break;
    case RankingTypeClient.Follower:
      title = `${prefix}Followers Ranking`;
      subtitle = 'Rank is based on the number of followers the user has on GitHub.';
      break;
    case RankingTypeClient.Star:
    default:
      title = `${prefix}Star Ranking`;
      subtitle = 'Rank is based on the total number of stars across repositories owned by a user.';
      break;
  }

  return [title, subtitle] as const;
}
