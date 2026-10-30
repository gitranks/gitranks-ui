import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Landing } from './components/landing';
import { OverviewScreen } from './components/overview-status';
import { ContributePageSkeleton } from './components/page-skeleton';
import { loadAttempts, loadContribute } from '@/lib/contribute/contribute.data';
import { contributeHomeOf } from '@/lib/contribute/contribute-state';

/** Contribute's home: the landing until the user is onboarded, then the overview. */
export default function ContributeHomePage({ searchParams }: PageProps<'/contribute'>) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[1180px] px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <ContributeHome searchParams={searchParams} />
    </Suspense>
  );
}

async function ContributeHome({ searchParams }: Pick<PageProps<'/contribute'>, 'searchParams'>) {
  // Read beside the view, for the overview; the landing does not wait for it.
  const reviews = loadAttempts('REVIEW', 5).catch(() => undefined);
  const [view, params] = await Promise.all([loadContribute(), searchParams]);
  if (!view) notFound();

  const home = contributeHomeOf(view, params);
  if (home.screen === 'overview') return <OverviewScreen view={view} reviews={await reviews} />;
  return <Landing viewer={home.viewer} preview={home.preview} />;
}
