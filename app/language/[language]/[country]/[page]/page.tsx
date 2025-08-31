'use cache';

import { unstable_cacheLife as cacheLife } from 'next/cache';

import { Pagination } from '@/components/pagination/pagination';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchCountryLanguageRankings } from '@/graphql/helpers/fetch-country-language-rankings';
import { fetchLanguageRankings } from '@/graphql/helpers/fetch-language-rankings';
import { GlobalRankingsQuery } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';

const ITEMS_PER_PAGE = 100;

export default async function LanguageRanking({ params }: PageProps<'/language/[language]/[country]/[page]'>) {
  cacheLife('hours');

  const { language, country, page: pageParam } = await params;

  const countryName = decodeURIComponent(country);
  const languageName = decodeURIComponent(language);

  const method = country === 'global' ? fetchLanguageRankings : fetchCountryLanguageRankings;

  const page = parseInt(pageParam, 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [data, countries] = await Promise.all([
    method({ language: languageName, country: countryName, offset }),
    fetchCountries(),
  ]);

  return (
    <>
      <RankingTable
        rankingType={RankingTypeClient.Star}
        // sorry, but I have to :)
        data={data as GlobalRankingsQuery['globalRankings']}
        countries={countries}
      />
      <Pagination
        prev={page > 1 ? `/language/${languageName}/${countryName}/${page - 1}` : undefined}
        next={data?.length === ITEMS_PER_PAGE ? `/language/${languageName}/${countryName}/${page + 1}` : undefined}
      />
    </>
  );
}
