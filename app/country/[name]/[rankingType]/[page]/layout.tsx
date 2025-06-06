'use cache';

import type { Metadata } from 'next';
import { unstable_cacheLife as cacheLife } from 'next/cache';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { RankingTypeClient } from '@/types/ranking.types';

type CountryRankingProps = {
  children: React.ReactNode;
  params: Promise<{ name: string; rankingType: RankingTypeClient; page: string }>;
};

export const metadata: Metadata = {
  title: 'GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore ranks based on stars, followers, contributions, and more. Dive into dynamic leaderboards and find out how you measure up against developers worldwide.',
};

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
