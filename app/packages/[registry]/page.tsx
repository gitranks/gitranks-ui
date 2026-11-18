import { notFound, redirect } from 'next/navigation';

import { packageRankingRegistryOf } from '../package-rankings';
import { packageRankingPath } from '@/utils/package-paths';

// Unlisted registries render on request before the response starts, so the 404 is a real one.
export const instant = false;

export async function generateStaticParams() {
  return [{ registry: 'npm' }];
}

export default async function PackageRegistryRankingsPage({ params }: PageProps<'/packages/[registry]'>) {
  const { registry } = await params;

  if (!packageRankingRegistryOf(registry)) {
    notFound();
  }

  redirect(packageRankingPath('downloads', 1, registry));
}
