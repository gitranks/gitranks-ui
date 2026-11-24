import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestPageScreen } from '@/components/workspace/pull-request/page-screen';
import { pullRequestMetadataOf } from '@/lib/workspace/pull-request-title';

/** The tab names the repository and the issue, from the address. */
export const generateMetadata = ({
  params,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/runs/[runId]'>): Promise<Metadata> =>
  pullRequestMetadataOf(params);

/** A follow-up run's address, which emails and agents link: the pull request's page, opened at the run's round. */
export default function PullRequestRunPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/runs/[runId]'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <PullRequestPageScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}
