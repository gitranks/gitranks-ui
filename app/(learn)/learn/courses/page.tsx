import type { Metadata } from 'next';

import { JsonLd } from '@/components/json-ld/json-ld';
import { CoursesLive } from '@/components/learn/courses/courses-live';
import { loadLearnCourses, loadLearnLessons } from '@/lib/learn/course.data';
import { learnCoursesJsonLd, learnCoursesMetadata } from '@/lib/learn/seo/course';

/**
 * All courses (page 24): the same for everyone, read from the cached list under its tag; the person's side is read
 * later in the browser. The address's `?q=` opens the page with a search typed; such a page names the full list as
 * the one to index.
 */
export const instant = false;

/** What `?q=` carried: one value, as typed. */
const queryOf = (q: string | string[] | undefined) => (typeof q === 'string' ? q : '');

export async function generateMetadata({ searchParams }: PageProps<'/learn/courses'>): Promise<Metadata> {
  const [{ q }, courses] = await Promise.all([searchParams, loadLearnCourses()]);
  return learnCoursesMetadata(courses, { searched: queryOf(q).trim() !== '' });
}

export default async function CoursesPage({ searchParams }: PageProps<'/learn/courses'>) {
  // The lessons only feed the search: when they cannot be read, the list still draws and the search finds courses.
  const [{ q }, courses, lessons] = await Promise.all([
    searchParams,
    loadLearnCourses(),
    loadLearnLessons().catch(() => []),
  ]);
  return (
    <>
      <JsonLd payloads={learnCoursesJsonLd(courses)} />
      <CoursesLive courses={courses} lessons={lessons} query={queryOf(q)} />
    </>
  );
}
