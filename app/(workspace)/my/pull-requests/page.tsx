import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { PullRequestsView } from '@/components/workspace/pull-requests-view';

export const metadata: Metadata = { title: 'Pull requests' };

/** The Pull requests tab: what the user sent or is about to send to maintainers, and what each needs from them. */
export default function PullRequestsPage({ searchParams }: PageProps<'/my/pull-requests'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <PullRequestsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
