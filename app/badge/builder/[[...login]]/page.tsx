'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';

import { BadgeBuilder } from './components/badge-builder';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * One page for every builder URL: the steps live in the query, which this cached page never reads. The builder loads
 * its entity on the page; old builder links are redirected before they get here.
 */
// async: the file-level `use cache` directive requires it.
export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: '/badge/builder' },
  };
}

export default async function BadgeBuilderPage() {
  cacheLife('days');

  return (
    <Suspense fallback={<BuilderFallback />}>
      <BadgeBuilder />
    </Suspense>
  );
}

function BuilderFallback() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6" aria-busy="true">
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
