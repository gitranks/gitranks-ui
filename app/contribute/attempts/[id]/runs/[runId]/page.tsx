import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '../../../../components/page-skeleton';
import { RunSessionView } from '../../../../components/review-view';

export const metadata: Metadata = { title: 'A contribution' };

export default function ContributeRunPage({
  params,
  searchParams,
}: PageProps<'/contribute/attempts/[id]/runs/[runId]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <RunSessionView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
