'use cache';

import { Metadata } from 'next';
import { unstable_cacheLife as cacheLife } from 'next/cache';

import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { RankingTypeClient } from '@/types/ranking.types';
import { getRankPropByType } from '@/utils/get-rank-prop-by-ranking-type';

type CountryRankingProps = {
  children: React.ReactNode;
  params: Promise<{ name: string; rankingType: RankingTypeClient; page: string }>;
};

export async function generateMetadata({ params }: CountryRankingProps): Promise<Metadata> {
  const { rankingType, page: pageParam, name } = await params;

  const rankProp = getRankPropByType(rankingType);
  const rankName = RANK_NAME[rankProp];
  const page = parseInt(pageParam, 10);

  return {
    title: `${decodeURIComponent(name)} ${rankName}ing · Page ${page} · GitRanks`,
    description:
      'Discover GitHub profile rankings by country with GitRanks. See the top developers ranked by stars, contributions, and followers - refreshed daily.',
  };
}

export async function generateStaticParams() {
  const countries = await fetchCountries();
  const page = '1';

  return countries.slice(0, 24).flatMap((country) => {
    return [
      { name: country.name, rankingType: RankingTypeClient.Contribution, page },
      { name: country.name, rankingType: RankingTypeClient.Follower, page },
      { name: country.name, rankingType: RankingTypeClient.Star, page },
    ];
  });
}

export default async function RankingListLayout({ children, params }: CountryRankingProps) {
  cacheLife('hours');
  const { rankingType, name } = await params;
  const countryName = decodeURIComponent(name);

  return (
    <>
      <Header />
      <Page className="max-w-5xl gap-6">
        <RankingHeaderSection rankingType={rankingType} countryName={countryName} />
        {children}
      </Page>
    </>
  );
}
