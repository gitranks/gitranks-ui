import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function RankingsPage() {
  redirect('/orgs/1' as Route);
}
