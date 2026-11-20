import type { Metadata } from 'next';
import { Suspense } from 'react';

import { KeyView } from '@/app/(workspace)/my/agent/components/agent-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Claude API key' };

/** The Claude key the hosted agent runs on: connect, replace, remove. */
export default function AgentKeyPage({ searchParams }: PageProps<'/my/agent/key'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <KeyView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
