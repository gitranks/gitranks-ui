import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestPageScreen } from '@/components/workspace/pull-request/page-screen';

export const metadata: Metadata = { title: 'A pull request' };

/** An earlier attempt's page: the pull request's page for that attempt. */
export default function EarlierPullRequestPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <PullRequestPageScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}
