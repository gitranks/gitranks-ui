'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { getRankPropByType } from '@/utils/get-rank-prop-by-ranking-type';
import { isRankingType } from '@/utils/is-ranking-type';

export async function generateMetadata({ params }: LayoutProps<'/by/[rankingType]/[page]'>): Promise<Metadata> {
  const { rankingType, page: pageParam } = await params;

  if (!isRankingType(rankingType)) {
    throw new Error(`Invalid ranking type: ${rankingType}`);
  }

  const rankProp = getRankPropByType(rankingType);
  const rankName = RANK_NAME[rankProp];
  const page = parseInt(pageParam ?? '1', 10);

  return {
    title: `${rankName}ing · Page ${page} · GitRanks`,
    description:
      'Explore ranks based on stars, followers, contributions, and more. Dive into dynamic leaderboards and find out how you measure up against developers worldwide.',
  };
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
