import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { COURSE_NOT_READ, withInterviewsSectionNoindex } from '@/lib/interviews/learn-noindex';
import { loadLearnCourse } from '@/lib/learn/course.data';
import { issuesViewOf } from '@/lib/learn/issues';
import { hasMergedFixOf } from '@/lib/learn/issues.data';
import { loadLearnLessonPage } from '@/lib/learn/lesson-page.data';
import { learnIssuesMetadata } from '@/lib/learn/seo/issues';

/**
 * A lesson in real projects: Issues with the lesson set, at the lesson's own address, with its open issues and the
 * merged fixes that used it in two groups (`open=1` the first alone, `fixed=1` the second). Its chip's cross leads to
 * plain Issues. Not found for a slug that is no live lesson of ours. The proxy sends an address of a lesson with
 * neither to the lesson, before the page streams; search engines keep the page only while it has a merged fix.
 */
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]/real-world'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { lesson: slug });
  const [names, fixed, course] = await Promise.all([
    issuesNamesOf(view),
    hasMergedFixOf('lesson', slug),
    lessonCourseOf(slug),
  ]);
  // A lesson of the section Interviews is not indexed while Interviews is closed.
  return withInterviewsSectionNoindex(learnIssuesMetadata(view, { at: 'lesson', names, fixed }), course);
}

/** The lesson's course, read by its slug, to know its section; `COURSE_NOT_READ` when a read fails. */
async function lessonCourseOf(slug: string) {
  try {
    const ours = await loadLearnLessonPage(slug);
    return ours ? await loadLearnCourse(ours.lesson.course.slug) : null;
  } catch {
    return COURSE_NOT_READ;
  }
}

export default async function LessonRealWorldPage({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]/real-world'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { lesson: slug });
  const names = await issuesNamesOf(view);
  if (!names.lesson) notFound();
  return <IssuesPage view={view} at="lesson" names={names} />;
}
