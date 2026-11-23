import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CourseGoneView } from '@/components/learn/course/course-gone';
import { courseGoneTextOf } from '@/lib/learn/course-gone';
import { lessonGoneStateOf } from '@/lib/learn/lesson-gone';
import { loadLearnAddress } from '@/lib/learn/lesson-page.data';
import { learnCourseGoneMetadata } from '@/lib/learn/seo/course';

/**
 * `/learn/courses/_gone/<slug>`, where the proxy sends a paused course (with a 503) or a removed one (with a 410):
 * `lib/learn/course-gate.ts`. `_gone` is not a slug's shape, so no course is ever under it. The page is the same for
 * everyone, read from the course's address and cached under its tag. Opened for a course that is neither, it is not
 * there.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/courses/_gone/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return learnCourseGoneMetadata(await loadLearnAddress('course', slug).catch(() => null));
}

export default async function CourseGonePage({ params }: PageProps<'/learn/courses/_gone/[slug]'>) {
  const { slug } = await params;
  const address = await loadLearnAddress('course', slug);
  const state = lessonGoneStateOf(address);
  if (!address || !state) notFound();
  return <CourseGoneView text={courseGoneTextOf(state, address)} state={state === 'PAUSED' ? 'paused' : 'removed'} />;
}
