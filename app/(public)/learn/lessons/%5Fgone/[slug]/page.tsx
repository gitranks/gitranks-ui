import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LessonGoneView } from '@/components/learn/lesson/lesson-gone';
import { LessonGoneLearner } from '@/components/learn/lesson/lesson-gone-learner';
import { lessonGoneStateOf, lessonGoneTextOf } from '@/lib/learn/lesson-gone';
import { loadLearnAddress } from '@/lib/learn/lesson-page.data';
import { learnLessonGoneMetadata } from '@/lib/learn/seo/lesson';

/**
 * `/learn/lessons/_gone/<slug>`, where the proxy sends a paused lesson (with a 503) or a removed one (with a 410):
 * `lib/learn/lesson-gate.ts`. `_gone` is not a slug's shape, so no lesson is ever under it. The page is the same for
 * everyone, read from the lesson's address and cached under its tag; a learner's line is read in the browser. Opened
 * for a lesson that is neither, it is not there.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/lessons/_gone/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return learnLessonGoneMetadata(await loadLearnAddress('lesson', slug).catch(() => null));
}

export default async function LessonGonePage({ params }: PageProps<'/learn/lessons/_gone/[slug]'>) {
  const { slug } = await params;
  const address = await loadLearnAddress('lesson', slug);
  const state = lessonGoneStateOf(address);
  if (!address || !state) notFound();
  return (
    <LessonGoneView
      state={state}
      text={lessonGoneTextOf(state, address)}
      course={address.course}
      learner={<LessonGoneLearner slug={slug} state={state} />}
    />
  );
}
