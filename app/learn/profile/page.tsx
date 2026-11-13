import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/app/contribute/components/page-skeleton';
import { LearnProfileView } from '@/app/learn/components/learn-profile';

export const metadata: Metadata = { title: 'Goal and level', robots: { index: false, follow: false } };

/** Goal and level: what every lesson is written for. The viewer's own, read per request. */
export default function LearnProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnProfileView />
      </Suspense>
    </main>
  );
}
