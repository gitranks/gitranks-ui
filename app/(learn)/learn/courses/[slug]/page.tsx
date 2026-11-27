import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { CourseLive } from '@/components/learn/course/course-live';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { loadInterviewsForCourse } from '@/lib/interviews/learn.data';
import { withInterviewsSectionNoindex } from '@/lib/interviews/learn-noindex';
import { loadLearnCourse, loadLearnCourses } from '@/lib/learn/course.data';
import { courseHrefOf, coursePath } from '@/lib/learn/paths';
import { LEARN_MISSING_METADATA, learnCourseJsonLd, learnCourseMetadata } from '@/lib/learn/seo/course';

/**
 * A course's page: the same for everyone, read from the cached course under its tag, with the other courses
 * named at its foot; the person's side is read later in the browser. The count of merged fixes links to them. The
 * page streams, so its own notFound() reaches
 * the browser with a 200: an unknown, paused, removed or moved course gets its real status from the proxy, which asks
 * first (`lib/learn/course-gate.ts`). A project course has its own address, where the proxy sends it; reached here all
 * the same, the page sends it there. What Interviews shows on the course (the companies whose plans use it, "Asked
 * at", a company's own course) is in the page only once Interviews is open to everyone; until then the page is
 * today's, and a person Interviews is open to reads it in the browser.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/courses/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const course = await loadLearnCourse(slug);
  return course ? withInterviewsSectionNoindex(learnCourseMetadata(course), course) : LEARN_MISSING_METADATA;
}

export default async function CoursePage({ params }: PageProps<'/learn/courses/[slug]'>) {
  const { slug } = await params;
  // The foot's other courses are a part of the page that may fail alone: it then names none.
  const [course, courses] = await Promise.all([loadLearnCourse(slug), loadLearnCourses().catch(() => [])]);
  if (!course) notFound();
  const own = courseHrefOf(course);
  if (own !== coursePath(slug)) permanentRedirect(own);
  // The public loader never throws: a failed read is an empty answer.
  const interviews = INTERVIEWS_OPEN_TO_EVERYONE ? await loadInterviewsForCourse(slug) : undefined;
  return (
    <>
      <JsonLd payloads={learnCourseJsonLd(course)} />
      <CourseLive course={course} others={courses} {...(interviews ? { interviews } : {})} />
    </>
  );
}
