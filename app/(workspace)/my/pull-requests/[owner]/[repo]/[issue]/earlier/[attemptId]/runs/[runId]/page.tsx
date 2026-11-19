import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { RunSessionView } from '@/components/workspace/pull-request/review-view';

export const metadata: Metadata = { title: 'A pull request' };

/** One follow-up run's session, under an earlier attempt's page. */
export default function EarlierPullRequestRunPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]/runs/[runId]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <RunSessionView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
