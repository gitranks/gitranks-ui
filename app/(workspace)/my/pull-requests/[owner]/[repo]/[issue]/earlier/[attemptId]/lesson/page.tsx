import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LessonView } from '@/app/learn/components/lesson-view';
import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { learnPageMetadata } from '@/lib/workspace/learn-page-title';

/** Named only to an account the workspace is open to (`learnPageMetadata`). */
export function generateMetadata(): Promise<Metadata> {
  return learnPageMetadata('A lesson');
}

/** A Learn pull request's Lesson view, under the page's header and its two views. */
export default function EarlierLessonPage({
  params,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]/lesson'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <LessonView params={params} />
    </Suspense>
  );
}
