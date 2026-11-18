import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/app/contribute/components/page-skeleton';
import { LearnStartView } from '@/app/learn/components/learn-start';

export const metadata: Metadata = { title: 'Start your own lesson', robots: { index: false, follow: false } };

/** Start your own lesson, for one issue: the viewer's own, read per request. Not indexed, and in no sitemap. */
export default function LearnStartPage({ params }: PageProps<'/learn/start/[owner]/[repo]/[number]'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnStartView params={params} />
      </Suspense>
    </main>
  );
}
