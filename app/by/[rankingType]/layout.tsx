'use cache';

import type { Metadata } from 'next';
import { unstable_cacheLife as cacheLife } from 'next/cache';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { RankingTypeClient } from '@/types/ranking.types';

type GlobalRankingProps = {
  children: React.ReactNode;
  params: Promise<{ rankingType: RankingTypeClient; page: string }>;
};

export const metadata: Metadata = {
  title: 'GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore ranks based on stars, followers, contributions, and more. Dive into dynamic leaderboards and find out how you measure up against developers worldwide.',
};

export async function generateStaticParams() {
  const page = '1';
  return [
    { rankingType: 'contributions', page },
    { rankingType: 'followers', page },
    { rankingType: 'stars', page },
  ];
}

export default async function RankingListLayout({ children, params }: GlobalRankingProps) {
  cacheLife('hours');
  const { rankingType } = await params;

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
