'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { repoLanguageRankingMetadata, repoLanguageRankingTitle } from '../../../components/repo-language-ranking';
import { REPO_LANGUAGES_LINK, RepoRankingHeader } from '../../../components/repo-ranking-header';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { parsePageParam } from '@/utils/parse-page-param';
import { resolveRepoLanguageName } from '@/utils/resolve-route-names';

// Renders on request as a whole page, which is then cached; the route is allowed to block.
export const instant = false;

export async function generateMetadata({
  params,
}: LayoutProps<'/repos/language/[language]/[page]'>): Promise<Metadata> {
  const { language, page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  const languageName = await resolveRepoLanguageName(decodeURIComponent(language));

  if (!page || !languageName) {
    notFound();
  }

  return repoLanguageRankingMetadata(languageName, page);
}

export default async function RepoLanguageRankingLayout({
  children,
  params,
}: LayoutProps<'/repos/language/[language]/[page]'>) {
  cacheLife('hours');
  const { language } = await params;
  const languageName = await resolveRepoLanguageName(decodeURIComponent(language));

  if (!languageName) {
    notFound();
  }

  return (
    <>
      <Header />
      <Page className="max-w-5xl gap-6">
        <RepoRankingHeader title={repoLanguageRankingTitle(languageName)} link={REPO_LANGUAGES_LINK} />
        {children}
      </Page>
    </>
  );
}
