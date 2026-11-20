import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LearnMaintainers, LearnReportLink } from '@/app/learn/components/learn-maintainers';
import { PrContext, PrLesson } from '@/app/learn/components/learn-pr-lesson';
import { LEARN_MAINTAINERS_METADATA } from '@/lib/learn/lesson-seo';
import type { PrLessonRead } from '@/lib/learn/pr-lesson';
import { loadPrLesson } from '@/lib/learn/pr-lesson.data';
import { attemptIdOf } from '@/lib/workspace/pr-feedback';

export const metadata: Metadata = LEARN_MAINTAINERS_METADATA;

type Query = PageProps<'/learn/maintainers'>['searchParams'];

/**
 * For the maintainer who got a Learn pull request: open to every visitor, as its footer links here. The page renders
 * at once; opened from that footer (`?from=`, Learn spec §9.3) the pull request streams in at the top, and its lesson,
 * the author's result and "Did this help?" after "What that means". An id we did not give, a Contribute pull request
 * or a slow read adds nothing.
 */
export default function LearnMaintainersPage({ searchParams }: PageProps<'/learn/maintainers'>) {
  // One read of the footer link, shared by the two places that show it.
  const read = searchParams.then(({ from, react }) => (attemptIdOf(from) ? loadPrLesson(from, react) : null));
  return (
    <LearnMaintainers
      context={
        <Suspense fallback={null}>
          <ContextSlot read={read} />
        </Suspense>
      }
      lesson={
        <Suspense fallback={null}>
          <LessonSlot read={read} />
        </Suspense>
      }
      report={
        <Suspense fallback={<LearnReportLink />}>
          <ReportSlot searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}

async function ContextSlot({ read }: { read: Promise<PrLessonRead | null> }) {
  const answer = await read;
  return answer ? <PrContext card={answer.card} /> : null;
}

async function LessonSlot({ read }: { read: Promise<PrLessonRead | null> }) {
  const answer = await read;
  return answer ? <PrLesson read={answer} /> : null;
}

async function ReportSlot({ searchParams }: { searchParams: Query }) {
  return <LearnReportLink from={attemptIdOf((await searchParams).from)} />;
}
