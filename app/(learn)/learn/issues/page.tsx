import type { Metadata } from 'next';

import { IssuesPage, issuesNamesOf } from '@/components/learn/issues/issues-page';
import { issuesViewOf } from '@/lib/learn/issues';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { learnIssuesMetadata } from '@/lib/learn/seo/issues';

/**
 * Issues (page 8): real open issues to learn from, five at a time. The visitor's five for the view are the same for
 * everyone and drawn here; a signed-in person's own five, with the switches, are read in the browser. The address
 * sets the view: the chips (`?course=`, `?lesson=`, `?language=`, `?fixed=1`) and the switches (`?for-you=0`,
 * `?learned=1`). Behind Learn's gate: a visitor sees it once Learn is open to everyone.
 */
export const instant = false;

export async function generateMetadata({ searchParams }: PageProps<'/learn/issues'>): Promise<Metadata> {
  const view = issuesViewOf(await searchParams);
  const [names, open] = await Promise.all([issuesNamesOf(view), learnOpenToEveryoneCached()]);
  return learnIssuesMetadata(view, { names, open });
}

export default async function LearnIssuesPage({ searchParams }: PageProps<'/learn/issues'>) {
  const view = issuesViewOf(await searchParams);
  const [names, everyone] = await Promise.all([issuesNamesOf(view), learnOpenToEveryoneCached()]);
  return <IssuesPage view={view} at="issues" names={names} everyone={everyone} />;
}
