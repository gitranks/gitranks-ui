import { redirect } from 'next/navigation';

export default async function RankingsPage({ params }: PageProps<'/by/[rankingType]'>) {
  const { rankingType } = await params;
  redirect(`/by/${rankingType}/1`);
}
