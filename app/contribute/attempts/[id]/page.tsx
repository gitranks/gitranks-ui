import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { FirstSessionView } from '@/components/workspace/pull-request/review-view';

export const metadata: Metadata = { title: 'A contribution' };

export default function ContributeAttemptPage({ params, searchParams }: PageProps<'/contribute/attempts/[id]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <FirstSessionView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
