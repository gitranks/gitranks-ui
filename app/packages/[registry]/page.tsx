import { notFound, redirect } from 'next/navigation';

import { packageRankingFirstOrder, packageRankingRegistryOf } from '../package-rankings';
import { REGISTRY_IDS } from '@/lib/packages/registries';
import { packageRankingPath } from '@/utils/package-paths';

// The proxy answers an unknown registry with a 404 before anything renders, so only a known one reaches this page; the
// check below keeps the page safe on its own. Every registry is listed so its redirect is prerendered.
export const instant = false;

export async function generateStaticParams() {
  return REGISTRY_IDS.map((registry) => ({ registry }));
}

export default async function PackageRegistryRankingsPage({ params }: PageProps<'/packages/[registry]'>) {
  const { registry } = await params;

  const known = packageRankingRegistryOf(registry);
  if (!known) {
    notFound();
  }

  // Downloads where the registry counts them, else Dependents' stars.
  redirect(packageRankingPath(packageRankingFirstOrder(known.id), 1, known.id));
}
