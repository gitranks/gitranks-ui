import type { Metadata } from 'next';

import { coursesInterviewsOf } from '@/components/interviews/learn-gate/courses-interviews';
import { JsonLd } from '@/components/json-ld/json-ld';
import { CoursesLive } from '@/components/learn/courses/courses-live';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { loadInterviewsForCourses } from '@/lib/interviews/learn.data';
import { loadLearnCourses, loadLearnLessons } from '@/lib/learn/course.data';
import { learnCoursesJsonLd, learnCoursesMetadata } from '@/lib/learn/seo/course';

/**
 * All courses: the same for everyone, read from the cached list under its tag; the person's side is read
 * later in the browser. The address's `?q=` opens the page with a search typed; such a page names the full list as
 * the one to index. Interviews' part (the row of companies, the companies in the search, its section) is in the page
 * only once Interviews is open to everyone; until then the page is today's, and a person Interviews is open to reads
 * the part in the browser.
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
  const interviews = INTERVIEWS_OPEN_TO_EVERYONE
    ? coursesInterviewsOf(await loadInterviewsForCourses(), courses)
    : null;
  return (
    <>
      <JsonLd payloads={learnCoursesJsonLd(courses)} />
      <CoursesLive courses={courses} lessons={lessons} query={queryOf(q)} {...(interviews ? { interviews } : {})} />
    </>
  );
}
