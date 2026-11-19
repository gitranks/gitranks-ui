import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LessonView } from '@/app/learn/components/lesson-view';
import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'A lesson' };

/** A Learn pull request's Lesson view, under the page's header and its two views. */
export default function LessonPage({ params }: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/lesson'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <LessonView params={params} />
    </Suspense>
  );
}
