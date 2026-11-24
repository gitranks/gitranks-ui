import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { issuesViewOf } from '@/lib/learn/issues';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { learnIssuesMetadata } from '@/lib/learn/seo/issues';

/**
 * A lesson in the real world (page 53): Issues with the lesson set, at the lesson's own address. Its chip's cross
 * leads to Issues without it. Not found for a slug that is no live lesson of ours. Behind Learn's gate, as Issues.
 */
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]/real-world'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { lesson: slug });
  const [names, open] = await Promise.all([issuesNamesOf(view), learnOpenToEveryoneCached()]);
  return learnIssuesMetadata(view, { at: 'lesson', names, open });
}

export default async function LessonRealWorldPage({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]/real-world'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const view = issuesViewOf(query, { lesson: slug });
  const [names, everyone] = await Promise.all([issuesNamesOf(view), learnOpenToEveryoneCached()]);
  if (!names.lesson) notFound();
  return <IssuesPage view={view} at="lesson" names={names} everyone={everyone} />;
}
