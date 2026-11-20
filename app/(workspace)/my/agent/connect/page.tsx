import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { OwnAgentConnectView } from '@/components/workspace/agent/connect-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { notEnteredTargetOf } from '@/lib/workspace/gate';
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

/** An account that has not entered connects its agent in Contribute's flow, the query kept. */
async function AgentConnect({ searchParams }: Pick<Params, 'searchParams'>) {
  const [gate, params] = await Promise.all([loadWorkspaceGate(), searchParams]);
  if (gate.kind === 'open' && !gate.entered) {
    const to = notEnteredTargetOf(WORKSPACE_PATHS.agentConnect, searchParamsOf(params));
    if (to) redirect(to);
  }
  return <OwnAgentConnectView searchParams={searchParams} />;
}
