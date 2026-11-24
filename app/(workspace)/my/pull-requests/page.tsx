import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestListPage } from '@/components/workspace/pull-request/list-page';

export const metadata: Metadata = { title: 'Pull requests' };

/** The Pull requests tab: the person's fixes in Learn and Contribute, by who has to act. */
export default function PullRequestsPage({ searchParams }: PageProps<'/my/pull-requests'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <PullRequestListPage searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
