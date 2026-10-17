'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { OrgRankingTable } from '../components/org-ranking-table';
import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { RANK_NAME } from '@/badge/badge.consts';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { buildOrgRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { pageSuffix } from '@/lib/seo/page-metadata';
import { OrgRankingsDocument } from '@/types/generated/graphql';
import { parsePageParam } from '@/utils/parse-page-param';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function OrgRanking({ params }: PageProps<'/orgs/[page]'>) {
  cacheLife('hours');

  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!page) {
    notFound();
  }

  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [{ orgRankings }, countries] = await Promise.all([
    graphqlDirect(OrgRankingsDocument, { offset }),
    fetchCountries(),
  ]);

  return (
    <>
      <JsonLd
        payloads={[
          buildOrgRankingItemList(`${RANK_NAME.o}ing${pageSuffix(page)}`, `/orgs/${page}`, orgRankings, offset),
        ]}
      />
      <OrgRankingTable data={orgRankings} countries={countries} />
      <Pagination
        prev={page > 1 ? `/orgs/${page - 1}` : undefined}
        next={orgRankings?.length === ITEMS_PER_PAGE && page < MAX_PAGES ? `/orgs/${page + 1}` : undefined}
      />
    </>
  );
}
