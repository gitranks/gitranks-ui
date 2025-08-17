'use cache';

import type { Metadata } from 'next';
import { unstable_cacheLife as cacheLife } from 'next/cache';

import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { RankingTypeClient } from '@/types/ranking.types';
import { getRankPropByType } from '@/utils/get-rank-prop-by-ranking-type';

type GlobalRankingProps = {
  children: React.ReactNode;
  params: Promise<{ rankingType: RankingTypeClient; page: string }>;
};

export async function generateMetadata({ params }: GlobalRankingProps): Promise<Metadata> {
  const { rankingType, page: pageParam } = await params;

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
