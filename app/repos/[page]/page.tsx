'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { RepoRankingTable } from '../components/repo-ranking-table';
import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { buildRepoRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { fetchRepoRankings } from '@/graphql/helpers/fetch-repo-rankings';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { pageSuffix } from '@/lib/seo/page-metadata';
import { parsePageParam } from '@/utils/parse-page-param';
import { getRepoRankingPath } from '@/utils/repo-paths';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function RepoRanking({ params }: PageProps<'/repos/[page]'>) {
  cacheLife('hours');

  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!page || page > RANKING_MAX_PAGE.repo) {
    notFound();
  }

  const offset = (page - 1) * ITEMS_PER_PAGE;
  const rows = await fetchRepoRankings({ offset });

  if (!rows.length && page > 1) {
    notFound();
  }

  return (
    <>
      <JsonLd
        payloads={[
          buildRepoRankingItemList(
            `Repository Ranking${pageSuffix(page)}`,
            getRepoRankingPath(page),
            's',
            rows,
            offset,
          ),
        ]}
      />
      <RepoRankingTable data={rows} />
      <Pagination
        prev={page > 1 ? getRepoRankingPath(page - 1) : undefined}
        next={rows.length === ITEMS_PER_PAGE && page < MAX_PAGES ? getRepoRankingPath(page + 1) : undefined}
      />
    </>
  );
}
