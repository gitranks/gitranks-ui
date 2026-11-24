import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { issuesViewOf } from '@/lib/learn/issues';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { learnIssuesMetadata } from '@/lib/learn/seo/issues';

/**
 * A course in the real world: Issues with the course set, at the course's own address. Its chip's cross leads to
 * Issues without it. Not found for a slug that is no live course of ours. Behind Learn's gate, as Issues.
 */
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/courses/[slug]/real-world'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { course: slug });
  const [names, open] = await Promise.all([issuesNamesOf(view), learnOpenToEveryoneCached()]);
  return learnIssuesMetadata(view, { at: 'course', names, open });
}

export default async function CourseRealWorldPage({
  params,
  searchParams,
}: PageProps<'/learn/courses/[slug]/real-world'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { course: slug });
  const [names, everyone] = await Promise.all([issuesNamesOf(view), learnOpenToEveryoneCached()]);
  if (!names.course) notFound();
  return <IssuesPage view={view} at="course" names={names} everyone={everyone} />;
}
