import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LearnAboutView } from '@/app/learn/components/learn-front';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { LEARN_ABOUT_METADATA } from '@/lib/learn/lesson-seo';

/** One landing for search engines: this copy points at `/learn` and is not indexed. */
export const metadata: Metadata = LEARN_ABOUT_METADATA;

/** How Learn works: the landing as a learner reads it. */
export default function LearnAboutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <LearnAboutView />
    </Suspense>
  );
}
