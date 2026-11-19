import type { Metadata } from 'next';
import { Suspense } from 'react';

import { HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { LearnAttemptFrame, LearnAttemptView } from '@/app/learn/components/learn-attempt';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/** "A lesson" to its signed-in owner; a visitor's sign-in names nothing of Learn. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await viewerLogin()) ? 'A lesson' : 'Sign in', robots: { index: false, follow: false } };
}

/**
 * A Learn attempt: the lesson on the fix, then the pull request. The viewer's own, read per request. Back from GitHub's
 * access screen (`?resume=`), the pull request's form opens the pull request as on a contribution's page.
 */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

export default function LearnAttemptPage({ params, searchParams }: PageProps<'/learn/attempts/[id]'>) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderLine />
          <main className={MAIN}>
            <ContributePageSkeleton />
          </main>
        </>
      }
    >
      <LearnAttemptFrame>
        <main className={MAIN}>
          <LearnAttemptView params={params} searchParams={searchParams} />
        </main>
      </LearnAttemptFrame>
    </Suspense>
  );
}
