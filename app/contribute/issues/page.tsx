import type { Metadata } from 'next';
import { Suspense } from 'react';

import { IssuesView } from '../components/issues-view';
import { ContributePageSkeleton } from '../components/page-skeleton';

export const metadata: Metadata = { title: 'Issues for you' };

export default function ContributeIssuesPage({ searchParams }: PageProps<'/contribute/issues'>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <IssuesView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
