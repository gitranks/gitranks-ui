import { notFound, redirect } from 'next/navigation';

import { packageRankingRegistryOf } from '../package-rankings';
import { packageRankingPath } from '@/utils/package-paths';

// The proxy answers an unknown registry with a 404 before anything renders, so only a known one reaches this page; the
// check below keeps the page safe on its own. One registry is listed so the redirect is prerendered.
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
