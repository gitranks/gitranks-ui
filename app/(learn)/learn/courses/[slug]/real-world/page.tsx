import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { issuesViewOf } from '@/lib/learn/issues';
import { hasMergedFixOf } from '@/lib/learn/issues.data';
import { learnIssuesMetadata } from '@/lib/learn/seo/issues';

/**
 * A course in real projects: Issues with the course set, at the course's own address, with its open issues and the
 * merged fixes that used its lessons in two groups (`open=1` the first alone, `fixed=1` the second). Its chip's cross
 * leads to plain Issues. Not found for a slug that is no live course of ours. The proxy sends an address of a course
 * with neither to the course, before the page streams; search engines keep the page only while it has a merged fix.
 */
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/courses/[slug]/real-world'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { course: slug });
  const [names, fixed] = await Promise.all([issuesNamesOf(view), hasMergedFixOf('course', slug)]);
  return learnIssuesMetadata(view, { at: 'course', names, fixed });
}

export default async function CourseRealWorldPage({
  params,
  searchParams,
}: PageProps<'/learn/courses/[slug]/real-world'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { course: slug });
  const names = await issuesNamesOf(view);
  if (!names.course) notFound();
  return <IssuesPage view={view} at="course" names={names} />;
}
