import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { issuesViewOf } from '@/lib/learn/issues';
import { hasMergedFixOf } from '@/lib/learn/issues.data';
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
  const [names, fixed] = await Promise.all([issuesNamesOf(view), hasMergedFixOf('lesson', slug)]);
  return learnIssuesMetadata(view, { at: 'lesson', names, fixed });
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
