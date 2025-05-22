import { startOfMonth } from 'date-fns';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfilesForSitemapDocument } from '@/types/generated/graphql';
import { RankingType } from '@/types/ranking.types';

export default async function sitemap() {
  const { profilesForSitemap } = (await graphqlDirect(ProfilesForSitemapDocument)) ?? {};
  const startOfMonthDate = startOfMonth(new Date());
  const rankingTypes: RankingType[] = Object.values(RankingType) as RankingType[];

  return profilesForSitemap.map((profile) => ({
    url: `${process.env.NEXT_PUBLIC_URI}/profile/${profile.login}`,
    lastModified: startOfMonthDate.toISOString(),
    changeFrequency: 'monthly',
    images: rankingTypes.map(
      (rankingType) =>
        `${process.env.NEXT_PUBLIC_URI}/api/badge/${profile.login}?rankingType=${rankingType}&amp;template=medium`,
    ),
    priority: 0.95,
  }));
}
