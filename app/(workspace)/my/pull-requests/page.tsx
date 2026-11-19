import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributionsView } from '@/components/workspace/contributions-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Pull requests' };

/** The Pull requests tab: the user's contributions and lessons' pull requests, as My contributions shows them. */
export default function PullRequestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributionsView />
      </Suspense>
    </main>
  );
}
