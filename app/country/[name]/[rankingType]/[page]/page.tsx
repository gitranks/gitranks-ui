'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { RankingStats } from '@/components/ranking-stats/ranking-stats';
import { buildRankingStats } from '@/components/ranking-stats/ranking-stats.utils';
import { buildUserRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchCountryLanguageFacts } from '@/graphql/helpers/fetch-language-facts';
import { fetchRankedCounts } from '@/graphql/helpers/fetch-ranked-counts';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { pageSuffix } from '@/lib/seo/page-metadata';
import { CountryRankingsDocument, LanguageSummaryOrder } from '@/types/generated/graphql';
import { getRankingConfigByType, getRankingOrder } from '@/utils/get-ranking-config-by-type';
import { getRankingTitle } from '@/utils/get-ranking-title';
import { isRankingType } from '@/utils/is-ranking-type';
import { parsePageParam } from '@/utils/parse-page-param';
import { resolveCountryName } from '@/utils/resolve-route-names';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

const ITEMS_PER_PAGE = 100;

export default async function CountryRanking({ params }: PageProps<'/country/[name]/[rankingType]/[page]'>) {
  cacheLife('hours');

  const { name, rankingType, page: pageParam } = await params;

  const page = parsePageParam(pageParam);
  // Case variants (`germany`) render the stored spelling's ranking and canonicalize to it.
  const countryName = await resolveCountryName(decodeURIComponent(name));

  if (!isRankingType(rankingType) || !page || page > RANKING_MAX_PAGE.country || !countryName) {
    notFound();
  }

  const queryOrder = getRankingOrder(rankingType);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const isFirstPage = page === 1;
  const [{ countryRankings }, countries, rankedCounts, languages] = await Promise.all([
    graphqlDirect(CountryRankingsDocument, { order: queryOrder, offset, country: countryName }),
    fetchCountries(),
    isFirstPage ? fetchRankedCounts(countryName) : null,
    isFirstPage ? fetchCountryLanguageFacts({ country: countryName, order: LanguageSummaryOrder.Score, limit: 3 }) : [],
  ]);

  if (!countryRankings.length) {
    notFound();
  }

  const [title] = getRankingTitle(rankingType, countryName);
  const basePath = `/country/${encodeURIComponent(countryName)}/${rankingType}`;
  const [rankProp] = getRankingConfigByType(rankingType);
  const stats = isFirstPage
    ? buildRankingStats({
        rankingType,
        country: countryName,
        rankedCount: rankedCounts?.[`${rankProp}Users`],
        leaders: countryRankings
          .slice(0, 3)
          .flatMap((row) => (row.user ? [{ login: row.user.login, score: row.user[rankProp] }] : [])),
        languages: languages.length
          ? { names: languages.map(({ language }) => language), date: languages[0].date }
          : null,
      })
    : [];

  return (
    <>
      <JsonLd
        payloads={[
          buildUserRankingItemList(
            `${title}${pageSuffix(page)}`,
            `${basePath}/${page}`,
            rankingType,
            countryRankings,
            offset,
          ),
        ]}
      />
      <RankingTable rankingType={rankingType} data={countryRankings} countries={countries} />
      <RankingStats parts={stats} />
      <Pagination
        prev={page > 1 ? `${basePath}/${page - 1}` : undefined}
        next={
          countryRankings.length === ITEMS_PER_PAGE && page < RANKING_MAX_PAGE.country
            ? `${basePath}/${page + 1}`
            : undefined
        }
      />
    </>
  );
}
