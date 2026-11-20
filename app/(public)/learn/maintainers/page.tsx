import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LearnMaintainers, LearnReportLink } from '@/app/learn/components/learn-maintainers';
import { PrContext, PrLesson } from '@/app/learn/components/learn-pr-lesson';
import { LEARN_MAINTAINERS_METADATA } from '@/lib/learn/lesson-seo';
import type { PrLessonRead } from '@/lib/learn/pr-lesson';
import { loadLearnPrCard, loadPrLesson } from '@/lib/learn/pr-lesson.data';
import type { ContributePrCard } from '@/lib/workspace/contribute.types';
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
  // The footer link's pull request, on top as soon as it is read; its lesson and the author's result after it.
  const card = searchParams.then(({ from }) => (attemptIdOf(from) ? loadLearnPrCard(from) : null));
  const read = Promise.all([card, searchParams]).then(([learnCard, { react }]) => loadPrLesson(learnCard, react));
  return (
    <LearnMaintainers
      context={
        <Suspense fallback={null}>
          <ContextSlot card={card} />
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

async function ContextSlot({ card }: { card: Promise<ContributePrCard | null> }) {
  const read = await card;
  return read ? <PrContext card={read} /> : null;
}

async function LessonSlot({ read }: { read: Promise<PrLessonRead | null> }) {
  const answer = await read;
  return answer ? <PrLesson read={answer} /> : null;
}

async function ReportSlot({ searchParams }: { searchParams: Query }) {
  return <LearnReportLink from={attemptIdOf((await searchParams).from)} />;
}
