import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/app/contribute/components/page-skeleton';
import { MyLessonsView } from '@/app/learn/components/my-lessons';

export const metadata: Metadata = { title: 'My lessons', robots: { index: false, follow: false } };

/** My lessons: the viewer's Learn attempts and the shared lessons they passed. Read per request. */
export default function MyLessonsPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <MyLessonsView />
      </Suspense>
    </main>
  );
}
