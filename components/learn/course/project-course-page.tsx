import 'server-only';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { CourseLive } from '@/components/learn/course/course-live';
import { loadLearnProjectCourse, loadLearnProjectOpenIssues } from '@/lib/learn/course.data';
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

/** The page: the course with its project's parts and its open issues (its foot names no other course). */
export async function ProjectCoursePage({ route }: { route: LearnProjectRoute | null }) {
  if (!route) notFound();
  const project = projectOfRoute(route);
  // The open issues are read apart and show none when they cannot be read.
  const [course, openIssues] = await Promise.all([
    loadLearnProjectCourse(project),
    loadLearnProjectOpenIssues(project),
  ]);
  if (!course) notFound();
  return (
    <>
      <JsonLd payloads={learnCourseJsonLd(course)} />
      <CourseLive course={course} others={[]} projectIssues={openIssues} />
    </>
  );
}
