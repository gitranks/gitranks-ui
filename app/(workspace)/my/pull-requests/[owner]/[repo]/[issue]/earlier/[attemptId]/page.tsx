import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { FirstSessionView } from '@/components/workspace/pull-request/review-view';

export const metadata: Metadata = { title: 'A pull request' };

/** An earlier attempt's first session, or its next step (`?session=next`). */
export default function EarlierPullRequestPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <FirstSessionView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
