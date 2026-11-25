import type { Metadata } from 'next';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { issuesViewOf } from '@/lib/learn/issues';
import { learnIssuesMetadata } from '@/lib/learn/seo/issues';

/**
 * Issues: real open issues to learn from, five at a time. The visitor's five for the view are the same for
 * everyone and drawn here; a signed-in person's own five, with the switches, are read in the browser. The address
 * sets the view: the chips (`?course=`, `?lesson=`, `?language=`, `?fixed=1`) and the switches (`?for-you=0`,
 * `?learned=1`).
 */
export const instant = false;

export async function generateMetadata({ searchParams }: PageProps<'/learn/issues'>): Promise<Metadata> {
  const view = issuesViewOf(await searchParams);
  return learnIssuesMetadata(view, { names: await issuesNamesOf(view) });
}

export default async function LearnIssuesPage({ searchParams }: PageProps<'/learn/issues'>) {
  const view = issuesViewOf(await searchParams);
  const names = await issuesNamesOf(view);
  return <IssuesPage view={view} at="issues" names={names} />;
}
