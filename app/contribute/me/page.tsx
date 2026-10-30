import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributionsView } from '../components/contributions-view';
import { ContributePageSkeleton } from '../components/page-skeleton';

export const metadata: Metadata = { title: 'My contributions' };

export default function ContributeMine() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributionsView />
      </Suspense>
    </main>
  );
}
