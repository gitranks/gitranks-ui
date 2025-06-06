import { redirect } from 'next/navigation';

import { RankingTypeClient } from '@/types/ranking.types';

type RankingsPageProps = {
  params: Promise<{ rankingType: RankingTypeClient; page: string }>;
};

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { rankingType } = await params;
  redirect(`/by/${rankingType}/1`);
}
