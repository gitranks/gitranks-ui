import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ProgressView } from '@/components/learn/progress/progress-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Your progress' };

/** Your progress: what the user has learned so far, and where their fixes landed. Read per request. */
export default function ProgressPage({ searchParams }: PageProps<'/my/progress'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ProgressView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
