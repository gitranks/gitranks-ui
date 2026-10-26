'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { RepoLanguageRanking } from '../../components/repo-language-ranking';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { parsePageParam } from '@/utils/parse-page-param';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function RepoNoLanguageRankingPage({ params }: PageProps<'/repos/no-language/[page]'>) {
  cacheLife('hours');

  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!page || page > RANKING_MAX_PAGE.repo) {
    notFound();
  }

  return <RepoLanguageRanking language={null} page={page} />;
}
