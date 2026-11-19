import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { ContributionLayout } from '@/components/workspace/pull-request/review-view';

/**
 * An earlier attempt on the issue (the person discarded one and started again): the same page as the latest's, with a
 * line above its header that leads to the latest.
 */
export default function EarlierPullRequestLayout({
  params,
  children,
}: LayoutProps<'/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributionLayout params={params}>{children}</ContributionLayout>
      </Suspense>
    </main>
  );
}
