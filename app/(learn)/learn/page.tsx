import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LearnFrontView } from '@/app/learn/components/learn-front';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadLearnCourses } from '@/lib/learn/course.data';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { learnLandingMetadata } from '@/lib/learn/seo/landing';

/**
 * `/learn`: the landing (page 4) for a visitor and for a signed-in person who has not set up Learn; Learn home (page 3)
 * for everyone else Learn is open to. Read per request. The landing is the page search engines get, indexed only while
 * Learn is open to everyone.
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const [courses, open] = await Promise.all([loadLearnCourses().catch(() => []), learnOpenToEveryoneCached()]);
  return learnLandingMetadata(courses, open);
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <LearnFrontView />
    </Suspense>
  );
}
