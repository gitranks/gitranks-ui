'use cache';

import { cacheLife } from 'next/cache';

import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { Pagination } from '@/components/pagination/pagination';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { GlobalRankingsDocument } from '@/types/generated/graphql';
import { getRankingOrder } from '@/utils/get-ranking-config-by-type';

export default async function GlobalRanking({ params }: PageProps<'/by/[rankingType]/[page]'>) {
  cacheLife('hours');

  const { rankingType, page: pageParam } = await params;
  const page = Number.parseInt(pageParam, 10);
  const queryOrder = getRankingOrder(rankingType);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [{ globalRankings }, countries] = await Promise.all([
    graphqlDirect(GlobalRankingsDocument, { order: queryOrder, offset }),
    fetchCountries(),
  ]);

  return (
    <>
      <RankingTable rankingType={rankingType} data={globalRankings} countries={countries} />
      <Pagination
        prev={page > 1 ? `/by/${rankingType}/${page - 1}` : undefined}
        next={
          globalRankings?.length === ITEMS_PER_PAGE && page < MAX_PAGES ? `/by/${rankingType}/${page + 1}` : undefined
        }
      />
    </>
  );
}
