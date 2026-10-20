'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { RankingStats } from '@/components/ranking-stats/ranking-stats';
import { buildRankingStats } from '@/components/ranking-stats/ranking-stats.utils';
import { buildUserRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';
import { fetchRankedCounts } from '@/graphql/helpers/fetch-ranked-counts';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { pageSuffix } from '@/lib/seo/page-metadata';
import { GlobalRankingsDocument, LanguageSummaryOrder } from '@/types/generated/graphql';
import { getRankingConfigByType, getRankingOrder } from '@/utils/get-ranking-config-by-type';
import { getRankingTitle } from '@/utils/get-ranking-title';
import { isRankingType } from '@/utils/is-ranking-type';
import { parsePageParam } from '@/utils/parse-page-param';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function GlobalRanking({ params }: PageProps<'/by/[rankingType]/[page]'>) {
  cacheLife('hours');

  const { rankingType, page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!isRankingType(rankingType) || !page || page > RANKING_MAX_PAGE.global) {
    notFound();
  }

  const queryOrder = getRankingOrder(rankingType);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const isFirstPage = page === 1;
  const [{ globalRankings }, countries, rankedCounts, languages] = await Promise.all([
    graphqlDirect(GlobalRankingsDocument, { order: queryOrder, offset }),
    fetchCountries(),
    // Extra facts for page one; the ranking still renders when one of them fails.
    isFirstPage ? fetchRankedCounts('global').catch(() => null) : null,
    isFirstPage ? fetchLanguageSummaries({ order: LanguageSummaryOrder.Score, limit: 3 }).catch(() => []) : [],
  ]);

  if (!globalRankings.length && page > 1) {
    notFound();
  }

  const [title] = getRankingTitle(rankingType);
  const path = `/by/${rankingType}/${page}`;
  const [rankProp] = getRankingConfigByType(rankingType);
  const stats = isFirstPage
    ? buildRankingStats({
        rankingType,
        rankedCount: rankedCounts?.[`${rankProp}Users`],
        leaders: globalRankings
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
        payloads={[buildUserRankingItemList(`${title}${pageSuffix(page)}`, path, rankingType, globalRankings, offset)]}
      />
      <RankingTable rankingType={rankingType} data={globalRankings} countries={countries} />
      <RankingStats parts={stats} />
      <Pagination
        prev={page > 1 ? `/by/${rankingType}/${page - 1}` : undefined}
        next={
          globalRankings?.length === ITEMS_PER_PAGE && page < MAX_PAGES ? `/by/${rankingType}/${page + 1}` : undefined
        }
      />
    </>
  );
}
