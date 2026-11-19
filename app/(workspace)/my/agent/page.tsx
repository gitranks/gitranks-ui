import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AgentView } from '@/components/workspace/agent/agent-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Agent' };

/** The Agent tab: the user's own agent, the hosted agent on their Claude key, and their runs. */
export default function AgentPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <AgentView />
      </Suspense>
    </main>
  );
}
