import { redirect } from 'next/navigation';

import { packageRankingFirstOrder } from './package-rankings';
import { DEFAULT_REGISTRY } from '@/lib/packages/registries';
import { packageRankingPath } from '@/utils/package-paths';

/** The default registry's rankings, on Downloads where it counts downloads, else on Dependents' stars. */
export default async function PackageRankingsPage() {
  redirect(packageRankingPath(packageRankingFirstOrder(DEFAULT_REGISTRY), 1, DEFAULT_REGISTRY));
}
