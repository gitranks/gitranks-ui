import 'server-only';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { CourseLive } from '@/components/learn/course/course-live';
import { loadLearnCourses, loadLearnProjectCourse, loadLearnProjectOpenIssues } from '@/lib/learn/course.data';
import { type LearnProjectRoute, projectOfRoute } from '@/lib/learn/paths';
import { LEARN_MISSING_METADATA, learnCourseJsonLd, learnCourseMetadata } from '@/lib/learn/seo/course';

/*
 * A project course's page (pages 25 and 26), at `/learn/repos/<owner>/<name>` and `/learn/orgs/<login>`: any course's
 * page, read from the cached course by its project, with the project's own parts. Its open issues change through the
 * day while the course is kept until the content changes, so they are read apart, kept for minutes only. The page
 * streams: a project with no course, or whose course was removed, gets its real status from the proxy, which asks
 * first (`lib/learn/course-gate.ts`).
 */

/** The page's metadata: the course's, at its project's address; the 404's when there is no course. */
export async function projectCourseMetadata(route: LearnProjectRoute | null): Promise<Metadata> {
  const course = route ? await loadLearnProjectCourse(projectOfRoute(route)) : null;
  return course ? learnCourseMetadata(course) : LEARN_MISSING_METADATA;
}

/** The page: the course with its project's parts, the other courses at its foot, and its open issues. */
export async function ProjectCoursePage({ route }: { route: LearnProjectRoute | null }) {
  if (!route) notFound();
  const project = projectOfRoute(route);
  // The other courses and the open issues are parts of the page that may fail alone: they then show none.
  const [course, courses, openIssues] = await Promise.all([
    loadLearnProjectCourse(project),
    loadLearnCourses().catch(() => []),
    loadLearnProjectOpenIssues(project),
  ]);
  if (!course) notFound();
  return (
    <>
      <JsonLd payloads={learnCourseJsonLd(course)} />
      <CourseLive course={course} others={courses} projectIssues={openIssues} />
    </>
  );
}
