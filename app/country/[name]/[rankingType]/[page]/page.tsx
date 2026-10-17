'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { buildUserRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { pageSuffix } from '@/lib/seo/page-metadata';
import { CountryRankingsDocument } from '@/types/generated/graphql';
import { getRankingOrder } from '@/utils/get-ranking-config-by-type';
import { getRankingTitle } from '@/utils/get-ranking-title';
import { isRankingType } from '@/utils/is-ranking-type';
import { parsePageParam } from '@/utils/parse-page-param';
import { resolveCountryName } from '@/utils/resolve-route-names';

const ITEMS_PER_PAGE = 100;

export default async function CountryRanking({ params }: PageProps<'/country/[name]/[rankingType]/[page]'>) {
  cacheLife('hours');

  const { name, rankingType, page: pageParam } = await params;

  const page = parsePageParam(pageParam);
  // Case variants (`germany`) render the stored spelling's ranking and canonicalize to it.
  const countryName = await resolveCountryName(decodeURIComponent(name));

  if (!isRankingType(rankingType) || !page || !countryName) {
    notFound();
  }

  const queryOrder = getRankingOrder(rankingType);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [{ countryRankings }, countries] = await Promise.all([
    graphqlDirect(CountryRankingsDocument, { order: queryOrder, offset, country: countryName }),
    fetchCountries(),
  ]);

  const [title] = getRankingTitle(rankingType, countryName);
  const basePath = `/country/${encodeURIComponent(countryName)}/${rankingType}`;

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
      <Pagination
        prev={page > 1 ? `${basePath}/${page - 1}` : undefined}
        next={countryRankings?.length === ITEMS_PER_PAGE ? `${basePath}/${page + 1}` : undefined}
      />
    </>
  );
}
