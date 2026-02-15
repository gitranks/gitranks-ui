'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';

import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';

export async function generateMetadata({ params }: LayoutProps<'/orgs/[page]'>): Promise<Metadata> {
  const { page: pageParam } = await params;

  const rankName = RANK_NAME.o;
  const page = parseInt(pageParam ?? '1', 10);

  return {
    title: `${rankName}ing · Page ${page} · GitRanks`,
    description: 'Explore organizations ranked by their popularity on GitHub.',
  };
}

export async function generateStaticParams() {
  return [{ page: '1' }];
}

export default async function RankingListLayout({ children }: LayoutProps<'/orgs/[page]'>) {
  cacheLife('hours');

  return (
    <>
      <Header />
      <Page className="max-w-5xl gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">{RANK_NAME.o}</h1>
        </div>
        {children}
      </Page>
    </>
  );
}
