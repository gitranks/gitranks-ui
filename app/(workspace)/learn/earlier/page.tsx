import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { LearnTab } from '@/app/(workspace)/learn/components/learn-tab-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadLearnOpen } from '@/lib/learn/learn.data';
import { LEARN_EARLIER_METADATA } from '@/lib/learn/lesson-seo';

export const metadata: Metadata = LEARN_EARLIER_METADATA;

/** Today's Learn tab, read once Learn is open to the viewer: not found for anyone else. */
async function LearnEarlier() {
  if (!(await loadLearnOpen())) notFound();
  return <LearnTab />;
}

/**
 * Learn as it worked before its courses: your agent fixes an issue and you take a lesson on the fix. Not indexed and
 * not in Learn's bar; Learn home's foot links it. Its start pages keep their addresses.
 */
export default function LearnEarlierPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <LearnEarlier />
    </Suspense>
  );
}
