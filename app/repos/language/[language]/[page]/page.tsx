'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { RepoLanguageRanking } from '../../../components/repo-language-ranking';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { parsePageParam } from '@/utils/parse-page-param';
import { resolveRepoLanguageName } from '@/utils/resolve-route-names';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function RepoLanguageRankingPage({ params }: PageProps<'/repos/language/[language]/[page]'>) {
  cacheLife('hours');

  const { language, page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  // Case variants (`rust`) render the stored spelling's ranking and canonicalize to it.
  const languageName = await resolveRepoLanguageName(decodeURIComponent(language));

  if (!page || page > RANKING_MAX_PAGE.repo || !languageName) {
    notFound();
  }

  return <RepoLanguageRanking language={languageName} page={page} />;
}
