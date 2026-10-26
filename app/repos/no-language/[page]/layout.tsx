'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { repoLanguageRankingMetadata, repoLanguageRankingTitle } from '../../components/repo-language-ranking';
import { REPO_LANGUAGES_LINK, RepoRankingHeader } from '../../components/repo-ranking-header';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { parsePageParam } from '@/utils/parse-page-param';

// Renders on request as a whole page, which is then cached; the route is allowed to block.
export const instant = false;

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
      <Header />
      <Page className="max-w-5xl gap-6">
        <RepoRankingHeader title={repoLanguageRankingTitle(null)} link={REPO_LANGUAGES_LINK} />
        {children}
      </Page>
    </>
  );
}
