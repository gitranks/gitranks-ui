import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { ContributionLayout } from '@/components/workspace/pull-request/review-view';

/**
 * The pull request's page, by repo and issue: the viewer's newest attempt on the issue. Its layout holds the header and
 * the sessions, so moving between them (the first attempt, each run, the next step) reads only the session beneath it.
 */
export default function PullRequestLayout({
  params,
  children,
}: LayoutProps<'/my/pull-requests/[owner]/[repo]/[issue]'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributionLayout params={params}>{children}</ContributionLayout>
      </Suspense>
    </main>
  );
}
