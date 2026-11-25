import 'server-only';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CourseGoneView } from '@/components/learn/course/course-gone';
import { courseGoneTextOf } from '@/lib/learn/course-gone';
import { lessonGoneStateOf } from '@/lib/learn/lesson-gone';
import { loadLearnAddress } from '@/lib/learn/lesson-page.data';
import type { LearnProjectRoute } from '@/lib/learn/paths';
import { learnCourseGoneMetadata } from '@/lib/learn/seo/course';

/*
 * The page of a project course that was removed ("This course was removed") or paused, read from its
 * project's address and the same for everyone. Opened for a project whose course is neither, it is not there.
 */

/** Its metadata: the state as the title, never kept by search engines, even when the address cannot be read. */
export async function projectCourseGoneMetadata(route: LearnProjectRoute | null): Promise<Metadata> {
  const address = route ? await loadLearnAddress(route.kind, route.slug).catch(() => null) : null;
  return learnCourseGoneMetadata(address);
}

/** The page, by its project's address. */
export async function ProjectCourseGonePage({ route }: { route: LearnProjectRoute | null }) {
  const address = route ? await loadLearnAddress(route.kind, route.slug) : null;
  const state = lessonGoneStateOf(address);
  if (!address || !state) notFound();
  return <CourseGoneView text={courseGoneTextOf(state, address)} state={state === 'PAUSED' ? 'paused' : 'removed'} />;
}
