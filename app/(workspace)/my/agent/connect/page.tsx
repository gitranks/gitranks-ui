import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { OwnAgentConnectView } from '@/components/workspace/agent/connect-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { signTargetOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { searchParamsOf, WORKSPACE_PATHS } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: 'Connect your agent' };

type Params = PageProps<'/my/agent/connect'>;

export default function AgentConnectPage({ searchParams }: Params) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-9 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <AgentConnect searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** A person with neither sign connects their agent in Contribute's flow, the query kept. */
async function AgentConnect({ searchParams }: Pick<Params, 'searchParams'>) {
  const [gate, params] = await Promise.all([loadWorkspaceGate(), searchParams]);
  if (gate.kind === 'open') {
    const to = signTargetOf(WORKSPACE_PATHS.agentConnect, searchParamsOf(params), gate.signs);
    if (to) redirect(to);
  }
  return <OwnAgentConnectView searchParams={searchParams} />;
}
