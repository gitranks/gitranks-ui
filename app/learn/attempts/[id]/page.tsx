import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/app/contribute/components/page-skeleton';
import { LearnAttemptView } from '@/app/learn/components/learn-attempt';

export const metadata: Metadata = { title: 'A lesson', robots: { index: false, follow: false } };

/**
 * A Learn attempt: the lesson on the fix, then the pull request. The viewer's own, read per request. Back from GitHub's
 * access screen (`?resume=`), the pull request's form opens the pull request as on a contribution's page.
 */
export default function LearnAttemptPage({ params, searchParams }: PageProps<'/learn/attempts/[id]'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnAttemptView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
