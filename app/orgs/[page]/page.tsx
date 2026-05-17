'use cache';

import { cacheLife } from 'next/cache';

import { OrgRankingTable } from '../components/org-ranking-table';
import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { OrgRankingsDocument } from '@/types/generated/graphql';

export default async function OrgRanking({ params }: PageProps<'/orgs/[page]'>) {
  cacheLife('hours');

  const { page: pageParam } = await params;
  const page = Number.parseInt(pageParam, 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [{ orgRankings }, countries] = await Promise.all([
    graphqlDirect(OrgRankingsDocument, { offset }),
    fetchCountries(),
  ]);

  return (
    <>
      <OrgRankingTable data={orgRankings} countries={countries} />
      <Pagination
        prev={page > 1 ? `/orgs/${page - 1}` : undefined}
        next={orgRankings?.length === ITEMS_PER_PAGE && page < MAX_PAGES ? `/orgs/${page + 1}` : undefined}
      />
    </>
  );
}
