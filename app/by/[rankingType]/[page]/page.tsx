'use cache';

import { unstable_cacheLife as cacheLife } from 'next/cache';

import { Pagination } from '@/components/pagination/pagination';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { GlobalRankingsDocument } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';
import { getRankingOrder } from '@/utils/get-ranking-config-by-type';

const ITEMS_PER_PAGE = 100;

type GlobalRankingProps = {
  params: Promise<{ rankingType: RankingTypeClient; page: string }>;
};

export default async function GlobalRanking({ params }: GlobalRankingProps) {
  cacheLife('hours');

  const { rankingType, page: pageParam } = await params;
  const page = parseInt(pageParam, 10);
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
        next={globalRankings?.length === ITEMS_PER_PAGE ? `/by/${rankingType}/${page + 1}` : undefined}
      />
    </>
  );
}
