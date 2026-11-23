import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { CourseLive } from '@/components/learn/course/course-live';
import { loadLearnCourse, loadLearnCourses } from '@/lib/learn/course.data';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { LEARN_MISSING_METADATA, learnCourseJsonLd, learnCourseMetadata } from '@/lib/learn/seo/course';

/**
 * A course's page (page 2): the same for everyone, read from the cached course under its tag, with the other courses
 * named at its foot; the person's side is read later in the browser. The page streams, so its own notFound() reaches
 * the browser with a 200: an unknown, paused, removed or moved course gets its real status from the proxy, which asks
 * first (`lib/learn/course-gate.ts`).
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/courses/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const [course, open] = await Promise.all([loadLearnCourse(slug), learnOpenToEveryoneCached()]);
  return course ? learnCourseMetadata(course, { open }) : LEARN_MISSING_METADATA;
}

export default async function CoursePage({ params }: PageProps<'/learn/courses/[slug]'>) {
  const { slug } = await params;
  // The foot's other courses are a part of the page that may fail alone: it then names none.
  const [course, courses] = await Promise.all([loadLearnCourse(slug), loadLearnCourses().catch(() => [])]);
  if (!course) notFound();
  return (
    <>
      <JsonLd payloads={learnCourseJsonLd(course)} />
      <CourseLive course={course} others={courses} />
    </>
  );
}
