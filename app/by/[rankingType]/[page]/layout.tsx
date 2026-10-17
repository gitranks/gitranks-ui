'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { getRankingTitle } from '@/utils/get-ranking-title';
import { isRankingType } from '@/utils/is-ranking-type';
import { parsePageParam } from '@/utils/parse-page-param';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateMetadata({ params }: LayoutProps<'/by/[rankingType]/[page]'>): Promise<Metadata> {
  const { rankingType, page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!isRankingType(rankingType) || !page) {
    notFound();
  }

  const [title, subtitle] = getRankingTitle(rankingType);

  return pageMetadata({
    title: `${title}${pageSuffix(page)}`,
    description: `${title} of GitHub developers worldwide${pageClause(page)}. ${subtitle}`,
    path: `/by/${rankingType}/${page}`,
  });
}

export async function generateStaticParams() {
  const page = '1';
  return [
    { rankingType: 'contributions', page },
    { rankingType: 'followers', page },
    { rankingType: 'stars', page },
  ];
}

export default async function RankingListLayout({ children, params }: LayoutProps<'/by/[rankingType]/[page]'>) {
  cacheLife('hours');
  const { rankingType } = await params;

  if (!isRankingType(rankingType)) {
    return notFound();
  }

  return (
    <>
      <Header />
      <Page className="max-w-5xl gap-6">
        <RankingHeaderSection rankingType={rankingType} />
        {children}
      </Page>
    </>
  );
}
