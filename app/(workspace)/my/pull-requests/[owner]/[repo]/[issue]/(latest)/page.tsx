import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestPageScreen } from '@/components/workspace/pull-request/page-screen';

export const metadata: Metadata = { title: 'A pull request' };

/** The pull request's page: where it stands and the one thing to do, for Learn and Contribute. */
export default function PullRequestPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <PullRequestPageScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}
