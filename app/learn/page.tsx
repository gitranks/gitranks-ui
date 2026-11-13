import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/app/contribute/components/page-skeleton';
import { LearnHomeView } from '@/app/learn/components/learn-landing';

export const metadata: Metadata = {
  title: 'Learn from real open-source fixes',
  robots: { index: false, follow: false },
};

/** Learn's front door. Behind Learn's gate: not found for anyone Learn is not open to. */
export default function LearnHomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <LearnHomeView />
    </Suspense>
  );
}
