'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { RankingTypeClient } from '@/types/ranking.types';
import { getRankingTitle } from '@/utils/get-ranking-title';
import { isRankingType } from '@/utils/is-ranking-type';
import { parsePageParam } from '@/utils/parse-page-param';
import { resolveCountryName } from '@/utils/resolve-route-names';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateMetadata({
  params,
}: LayoutProps<'/country/[name]/[rankingType]/[page]'>): Promise<Metadata> {
  const { rankingType, page: pageParam, name } = await params;
  const page = parsePageParam(pageParam);
  const countryName = await resolveCountryName(decodeURIComponent(name));

  if (!isRankingType(rankingType) || !page || !countryName) {
    notFound();
  }

  const [title] = getRankingTitle(rankingType, countryName);
  const [rankingName, subtitle] = getRankingTitle(rankingType);

  return pageMetadata({
    title: `${title}${pageSuffix(page)}`,
    description: `${rankingName} of GitHub developers in ${countryName}${pageClause(page)}. ${subtitle}`,
    path: `/country/${encodeURIComponent(countryName)}/${rankingType}/${page}`,
  });
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

export default async function RankingListLayout({
  children,
  params,
}: LayoutProps<'/country/[name]/[rankingType]/[page]'>) {
  cacheLife('hours');
  const { rankingType, name } = await params;
  const countryName = await resolveCountryName(decodeURIComponent(name));

  if (!isRankingType(rankingType) || !countryName) {
    return notFound();
  }

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
