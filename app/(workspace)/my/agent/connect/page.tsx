import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OwnAgentConnectView } from '@/components/workspace/agent/connect-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Connect your agent' };

export default function AgentConnectPage({ searchParams }: PageProps<'/my/agent/connect'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-9 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <OwnAgentConnectView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
