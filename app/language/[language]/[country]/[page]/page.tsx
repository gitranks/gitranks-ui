'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { RankingStats } from '@/components/ranking-stats/ranking-stats';
import { buildLanguageRankingStats } from '@/components/ranking-stats/ranking-stats.utils';
import { buildUserRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchCountryLanguageRankings } from '@/graphql/helpers/fetch-country-language-rankings';
import { fetchCountryLanguageFacts, fetchLanguageFacts } from '@/graphql/helpers/fetch-language-facts';
import { fetchLanguageRankings } from '@/graphql/helpers/fetch-language-rankings';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { pageSuffix } from '@/lib/seo/page-metadata';
import { type GlobalRankingsQuery, LanguageSummaryOrder } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope, resolveLanguageName } from '@/utils/resolve-route-names';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

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
  const isFirstPage = page === 1;
  // Every language's place by stars, to find this one's: the summary has no lookup by language.
  const summaryOrder = { order: LanguageSummaryOrder.Score, limit: 100 };
  const [data, countries, summaries] = await Promise.all([
    method({ language: languageName, country: countryName, offset }),
    fetchCountries(),
    !isFirstPage
      ? []
      : isGlobal
        ? fetchLanguageFacts(summaryOrder)
        : fetchCountryLanguageFacts({ ...summaryOrder, country: countryName }),
  ]);

  if (!data.length) {
    notFound();
  }

  // sorry, but I have to :)
  const rows = data as GlobalRankingsQuery['globalRankings'];

  const summaryIndex = summaries.findIndex(({ language: name }) => name === languageName);
  const summary = summaries[summaryIndex];
  const stats = isFirstPage
    ? buildLanguageRankingStats({
        language: languageName,
        country: isGlobal ? undefined : countryName,
        summary: summary ? { position: summaryIndex + 1, usersCount: summary.usersCount, date: summary.date } : null,
        leaders: rows.slice(0, 3).flatMap((row) => (row.user ? [{ login: row.user.login, score: row.user.s }] : [])),
      })
    : [];

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
      <RankingStats parts={stats} />
      <Pagination
        prev={page > 1 ? getLanguageRankingPath(languageName, countryName, page - 1) : undefined}
        next={
          data.length === ITEMS_PER_PAGE && page < RANKING_MAX_PAGE.language
            ? getLanguageRankingPath(languageName, countryName, page + 1)
            : undefined
        }
      />
    </>
  );
}
