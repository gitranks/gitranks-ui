'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { GlobalRankingScreen } from '../components/global-ranking-view';
import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchLanguageFacts } from '@/graphql/helpers/fetch-language-facts';
import { fetchRankedCounts } from '@/graphql/helpers/fetch-ranked-counts';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { GlobalRankingsDocument, LanguageSummaryOrder } from '@/types/generated/graphql';
import { getRankingOrder } from '@/utils/get-ranking-config-by-type';
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
    isFirstPage ? fetchRankedCounts('global') : null,
    isFirstPage ? fetchLanguageFacts({ order: LanguageSummaryOrder.Score, limit: 3 }) : [],
  ]);

  if (!globalRankings.length && page > 1) {
    notFound();
  }

  return (
    <GlobalRankingScreen
      rankingType={rankingType}
      page={page}
      rows={globalRankings}
      countries={countries}
      rankedCounts={rankedCounts}
      languages={languages}
    />
  );
}
