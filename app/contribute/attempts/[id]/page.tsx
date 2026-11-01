import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '../../components/page-skeleton';
import { ReviewView } from '../../components/review-view';

export const metadata: Metadata = { title: 'A contribution' };

export default function ContributeAttemptPage({ params, searchParams }: PageProps<'/contribute/attempts/[id]'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ReviewView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
