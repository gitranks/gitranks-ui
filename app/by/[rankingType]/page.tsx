import { redirect } from 'next/navigation';

export default async function RankingsPage({ params }: { params: Promise<{ rankingType: string }> }) {
  const { rankingType } = await params;
  redirect(`/by/${rankingType}/1`);
}
