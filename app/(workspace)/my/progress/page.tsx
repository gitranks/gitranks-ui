import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ProgressView } from '@/components/learn/progress/progress-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';

/**
 * The page's title names it only to someone Learn is open to. A visitor reads the layout's sign-in card under a title
 * as plain as the card's; anyone else gets the site's own title (they get the 404).
 */
export async function generateMetadata(): Promise<Metadata> {
  const gate = await loadWorkspaceGate().catch(() => null);
  if (gate?.kind === 'open' && gate.learnOpen) return { title: 'Your progress' };
  return gate?.kind === 'signed-out' ? { title: 'Sign in' } : {};
}

/** Your progress: what the user has learned so far, and where their fixes landed. Read per request. */
export default function ProgressPage({ searchParams }: PageProps<'/my/progress'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ProgressView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
