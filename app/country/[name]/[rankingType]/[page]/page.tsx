'use cache';

import { unstable_cacheLife as cacheLife } from 'next/cache';

import { Pagination } from '@/components/pagination/pagination';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountryRankingsDocument } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';
import { getRankingOrder } from '@/utils/get-ranking-config-by-type';

const ITEMS_PER_PAGE = 100;

type CountryRankingProps = {
  params: Promise<{ name: string; rankingType: RankingTypeClient; page: string }>;
};

export default async function CountryRanking({ params }: CountryRankingProps) {
  cacheLife('hours');

  const { name, rankingType, page: pageParam } = await params;

  const page = parseInt(pageParam, 10);
  const countryName = decodeURIComponent(name);

  const queryOrder = getRankingOrder(rankingType);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [{ countryRankings }, countries] = await Promise.all([
    graphqlDirect(CountryRankingsDocument, { order: queryOrder, offset, country: countryName }),
    fetchCountries(),
  ]);

  return (
    <>
      <RankingTable rankingType={rankingType} data={countryRankings} countries={countries} />
      <Pagination
        prev={page > 1 ? `/country/${name}/${rankingType}/${page - 1}` : undefined}
        next={countryRankings?.length === ITEMS_PER_PAGE ? `/country/${name}/${rankingType}/${page + 1}` : undefined}
      />
    </>
  );
}
