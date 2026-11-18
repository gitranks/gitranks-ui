import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/app/contribute/components/page-skeleton';
import { LearnHomeView } from '@/app/learn/components/learn-landing';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { learnHomeMetadata } from '@/lib/learn/lesson-seo';

/** Indexed once the front door is open to visitors (Learn open to everyone); until then a visitor gets the 404. */
export async function generateMetadata(): Promise<Metadata> {
  return learnHomeMetadata(await learnOpenToEveryoneCached());
}

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
