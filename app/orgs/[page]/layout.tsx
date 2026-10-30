'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { parsePageParam } from '@/utils/parse-page-param';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateMetadata({ params }: LayoutProps<'/orgs/[page]'>): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!page) {
    notFound();
  }

  return pageMetadata({
    title: `${RANK_NAME.o}ing${pageSuffix(page)}`,
    description: `GitHub organizations ranked by the stars on the repositories they own${pageClause(page)}.`,
    path: `/orgs/${page}`,
  });
}

export async function generateStaticParams() {
  return [{ page: '1' }];
}

export default async function RankingListLayout({ children }: LayoutProps<'/orgs/[page]'>) {
  cacheLife('hours');

  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">{RANK_NAME.o}</h1>
        </div>
        {children}
      </Page>
    </>
  );
}
