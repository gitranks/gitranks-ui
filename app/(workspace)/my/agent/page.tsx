import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AgentView } from '@/app/contribute/components/settings-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Agent' };

/** The Agent tab: where things stand, the hosted agent's budget and model, the connections, the user's own agent. */
export default function AgentPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <AgentView />
      </Suspense>
    </main>
  );
}
