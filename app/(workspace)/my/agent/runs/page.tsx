import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RunsView } from '@/components/workspace/agent/runs-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Agent runs' };

export default function AgentRunsPage({ searchParams }: PageProps<'/my/agent/runs'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <RunsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
