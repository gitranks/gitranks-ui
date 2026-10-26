import { notFound } from 'next/navigation';

import { RepoRankingTable } from './repo-ranking-table';
import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Pagination } from '@/components/pagination/pagination';
import { buildRepoRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { fetchRepoRankings } from '@/graphql/helpers/fetch-repo-rankings';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { getRepoLanguageRankingPath } from '@/utils/repo-paths';

/** `null` is the ranking of repositories without a language. */
type Language = string | null;

export function repoLanguageRankingTitle(language: Language) {
  return language ? `${language} Repository Ranking` : 'Repositories Without a Language';
}

export function repoLanguageRankingMetadata(language: Language, page: number) {
  return pageMetadata({
    title: `${repoLanguageRankingTitle(language)}${pageSuffix(page)}`,
    description: language
      ? `GitHub repositories written mainly in ${language}, ranked by stars${pageClause(page)}.`
      : `GitHub repositories with no detected language, ranked by stars${pageClause(page)}.`,
    path: getRepoLanguageRankingPath(language, page),
  });
}

export const RepoLanguageRanking = async ({ language, page }: { language: Language; page: number }) => {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const rows = await fetchRepoRankings(language ? { offset, language } : { offset, noLanguage: true });

  if (!rows.length && page > 1) {
    notFound();
  }

  return (
    <>
      <JsonLd
        payloads={[
          buildRepoRankingItemList(
            `${repoLanguageRankingTitle(language)}${pageSuffix(page)}`,
            getRepoLanguageRankingPath(language, page),
            'l',
            rows,
            offset,
          ),
        ]}
      />
      <RepoRankingTable data={rows} rankProp="l" />
      <Pagination
        prev={page > 1 ? getRepoLanguageRankingPath(language, page - 1) : undefined}
        next={
          rows.length === ITEMS_PER_PAGE && page < MAX_PAGES
            ? getRepoLanguageRankingPath(language, page + 1)
            : undefined
        }
      />
    </>
  );
};
