import { RANK_DESCRIPTIONS } from '@/app/app.consts';
import { RankingTypeClient } from '@/types/ranking.types';

export function getRankingTitle(rankingType: RankingTypeClient, countryName?: string) {
  let title: string;
  let subtitle: string;

  const prefix = countryName ? `${countryName} ` : '';

  switch (rankingType) {
    case RankingTypeClient.Contribution:
      title = `${prefix}${RANK_DESCRIPTIONS.c.title}ing`;
      subtitle = RANK_DESCRIPTIONS.c.descriptionList;
      break;
    case RankingTypeClient.Follower:
      title = `${prefix}${RANK_DESCRIPTIONS.f.title}ing`;
      subtitle = RANK_DESCRIPTIONS.f.descriptionList;
      break;
    case RankingTypeClient.Star:
    default:
      title = `${prefix}${RANK_DESCRIPTIONS.s.title}ing`;
      subtitle = RANK_DESCRIPTIONS.s.descriptionList;
      break;
  }

  return [title, subtitle] as const;
}
