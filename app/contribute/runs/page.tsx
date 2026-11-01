import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '../components/page-skeleton';
import { RunsView } from '../components/runs-view';

export const metadata: Metadata = { title: 'Agent runs' };

export default function ContributeRunsPage({ searchParams }: PageProps<'/contribute/runs'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <RunsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
