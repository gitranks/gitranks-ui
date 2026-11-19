import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { FirstSessionView } from '@/components/workspace/pull-request/review-view';

export const metadata: Metadata = { title: 'A pull request' };

/** The first attempt's session, or the next step (`?session=next`). */
export default function PullRequestPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <FirstSessionView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
