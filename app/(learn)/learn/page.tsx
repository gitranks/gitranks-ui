import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LearnFrontView } from '@/app/learn/components/learn-front';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadLearnCourses } from '@/lib/learn/course.data';
import { learnLandingMetadata } from '@/lib/learn/seo/landing';

/**
 * `/learn`: the landing (page 4) for a visitor and for a signed-in person who has not set up Learn; Learn home (page 3)
 * for everyone else. Read per request. The landing is the page search engines get.
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return learnLandingMetadata(await loadLearnCourses().catch(() => []));
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
