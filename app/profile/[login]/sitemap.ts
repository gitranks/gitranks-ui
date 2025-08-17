'use cache';

import { startOfMonth } from 'date-fns';
import { cacheLife } from 'next/dist/server/use-cache/cache-life';

import { RANK_NAME } from '@/badge/badge.consts';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfilesForSitemapDocument } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';

export default async function sitemap() {
  cacheLife('hours');

  const { profilesForSitemap } = (await graphqlDirect(ProfilesForSitemapDocument)) ?? {};
  const startOfMonthDate = startOfMonth(new Date());
  const rankingTypes = Object.values(UserRankProp);

  return profilesForSitemap.map((profile) => ({
    url: `${process.env.NEXT_PUBLIC_URI}/profile/${profile.login}`,
    lastModified: startOfMonthDate.toISOString(),
    changeFrequency: 'monthly',
    images: rankingTypes.map(
      (rankingType) =>
        `${process.env.NEXT_PUBLIC_URI}/api/badge/v2/${
          profile.login
        }?ranking=${rankingType}&amp;context=global&amp;type=position&amp;meta=none&amp;label=${encodeURIComponent(
          RANK_NAME[rankingType],
        )}`,
    ),
    priority: 0.95,
  }));
}
