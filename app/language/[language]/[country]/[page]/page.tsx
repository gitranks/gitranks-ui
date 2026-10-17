'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { buildUserRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchCountryLanguageRankings } from '@/graphql/helpers/fetch-country-language-rankings';
import { fetchLanguageRankings } from '@/graphql/helpers/fetch-language-rankings';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { pageSuffix } from '@/lib/seo/page-metadata';
import type { GlobalRankingsQuery } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope, resolveLanguageName } from '@/utils/resolve-route-names';

const ITEMS_PER_PAGE = 100;

export default async function LanguageRanking({ params }: PageProps<'/language/[language]/[country]/[page]'>) {
  cacheLife('hours');

  const { language, country, page: pageParam } = await params;

  const page = parsePageParam(pageParam);
  // Case variants (`rust`, `germany`) render the stored spelling's ranking and canonicalize to it.
  const [languageName, countryName] = await Promise.all([
    resolveLanguageName(decodeURIComponent(language)),
    resolveCountryScope(decodeURIComponent(country)),
  ]);

  if (!page || page > RANKING_MAX_PAGE.language || !countryName) {
    notFound();
  }

  const isGlobal = countryName === GLOBAL_SCOPE;
  const method = isGlobal ? fetchLanguageRankings : fetchCountryLanguageRankings;

  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [data, countries] = await Promise.all([
    method({ language: languageName, country: countryName, offset }),
    fetchCountries(),
  ]);

  if (!data.length) {
    notFound();
  }

  // sorry, but I have to :)
  const rows = data as GlobalRankingsQuery['globalRankings'];

  return (
    <>
      <JsonLd
        payloads={[
          buildUserRankingItemList(
            `${isGlobal ? 'Global' : countryName} ${languageName} Language Ranking${pageSuffix(page)}`,
            getLanguageRankingPath(languageName, countryName, page),
            RankingTypeClient.Star,
            rows,
            offset,
          ),
        ]}
      />
      <RankingTable
        rankingType={RankingTypeClient.Star}
        data={rows}
        countries={countries}
        getCountryHref={(rowCountry) => getLanguageRankingPath(languageName, rowCountry)}
      />
      <Pagination
        prev={page > 1 ? getLanguageRankingPath(languageName, countryName, page - 1) : undefined}
        next={data?.length === ITEMS_PER_PAGE ? getLanguageRankingPath(languageName, countryName, page + 1) : undefined}
      />
    </>
  );
}
