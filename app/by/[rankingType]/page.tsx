import { redirect } from 'next/navigation';

import { RankingTypeClient } from '@/types/ranking.types';

// Listing the types prerenders their redirects; any other value is resolved on request.
export async function generateStaticParams() {
  return Object.values(RankingTypeClient).map((rankingType) => ({ rankingType }));
}

export default async function RankingsPage({ params }: PageProps<'/by/[rankingType]'>) {
  const { rankingType } = await params;
  redirect(`/by/${rankingType}/1`);
}
