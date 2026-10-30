'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { repoLanguageRankingMetadata, repoLanguageRankingTitle } from '../../components/repo-language-ranking';
import { REPO_LANGUAGES_LINK, RepoRankingHeader } from '../../components/repo-ranking-header';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { parsePageParam } from '@/utils/parse-page-param';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block and a page past the last
// one answers 404. The page says the same.
export const instant = false;

export async function generateStaticParams() {
  return [{ page: '1' }];
}

export async function generateMetadata({ params }: LayoutProps<'/repos/no-language/[page]'>): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!page) {
    notFound();
  }

  return repoLanguageRankingMetadata(null, page);
}

export default async function RepoNoLanguageRankingLayout({ children }: LayoutProps<'/repos/no-language/[page]'>) {
  cacheLife('hours');

  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">
        <RepoRankingHeader title={repoLanguageRankingTitle(null)} link={REPO_LANGUAGES_LINK} />
        {children}
      </Page>
    </>
  );
}
