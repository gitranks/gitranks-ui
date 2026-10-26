import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function RepoRankingsPage() {
  redirect('/repos/1' as Route);
}
