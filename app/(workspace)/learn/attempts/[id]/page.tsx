import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LearnAttemptView } from '@/app/learn/components/learn-attempt';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/** "A lesson" to its signed-in owner; a visitor's sign-in names nothing of Learn. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await viewerLogin()) ? 'A lesson' : 'Sign in', robots: { index: false, follow: false } };
}

/**
 * A Learn attempt: the lesson on the fix, then the pull request. The viewer's own, read per request. Back from GitHub's
 * access screen (`?resume=`), the pull request's form opens the pull request as on a contribution's page. The
 * workspace's tabs above it (Pull requests) once the viewer has entered; a visitor sees the header's line alone.
 */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

export default function LearnAttemptPage({ params, searchParams }: PageProps<'/learn/attempts/[id]'>) {
  return (
    <main className={MAIN}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnAttemptView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
