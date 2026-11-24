import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestPageScreen } from '@/components/workspace/pull-request/page-screen';
import { pullRequestMetadataOf } from '@/lib/workspace/pull-request-title';

/** The tab names the repository and the issue, from the address. */
export const generateMetadata = ({
  params,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]'>): Promise<Metadata> => pullRequestMetadataOf(params);

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
