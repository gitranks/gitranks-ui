import { redirect } from 'next/navigation';

import { packageRankingPath } from '@/utils/package-paths';

export default async function PackageRankingsPage() {
  redirect(packageRankingPath('downloads'));
}
