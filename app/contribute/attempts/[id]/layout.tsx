import { Suspense } from 'react';

import { ContributePageSkeleton } from '../../components/page-skeleton';
import { ContributionLayout } from '../../components/review-view';

/**
 * A contribution's layout, around the session shown: moving between its sessions (the first attempt, each run, the
 * next step) reads only the session, beneath it.
 */
export default function ContributeAttemptLayout({ params, children }: LayoutProps<'/contribute/attempts/[id]'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributionLayout params={params}>{children}</ContributionLayout>
      </Suspense>
    </main>
  );
}
