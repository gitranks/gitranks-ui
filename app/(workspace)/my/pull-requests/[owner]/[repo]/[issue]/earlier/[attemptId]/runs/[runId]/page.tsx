import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestPageScreen } from '@/components/workspace/pull-request/page-screen';

export const metadata: Metadata = { title: 'A pull request' };

/** A run of an earlier attempt: that attempt's page, opened at the run's round. */
export default function EarlierPullRequestRunPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]/runs/[runId]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <PullRequestPageScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}
