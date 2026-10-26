'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { REPO_LANGUAGES_LINK, RepoRankingHeader } from '../components/repo-ranking-header';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { parsePageParam } from '@/utils/parse-page-param';
import { getRepoRankingPath } from '@/utils/repo-paths';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateMetadata({ params }: LayoutProps<'/repos/[page]'>): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!page) {
    notFound();
  }

  return pageMetadata({
    title: `Repository Ranking${pageSuffix(page)}`,
    description: `GitHub repositories ranked by stars${pageClause(page)}.`,
    path: getRepoRankingPath(page),
  });
}

export async function generateStaticParams() {
  return [{ page: '1' }];
}

export default async function RepoRankingLayout({ children }: LayoutProps<'/repos/[page]'>) {
  cacheLife('hours');

  return (
    <>
      <Header />
      <Page className="max-w-5xl gap-6">
        <RepoRankingHeader title="Repository Ranking" link={REPO_LANGUAGES_LINK} />
        {children}
      </Page>
    </>
  );
}
