import { redirect } from 'next/navigation';

import { issuesHref, issuesQueryOf } from '@/app/contribute/components/issues-filter';

/**
 * Issues for you moved to the Contribute tab: an old link goes there, to its issues, with its filters (an `?after=`
 * page is dropped: the list grows in place now).
 */
export default async function ContributeIssuesPage({ searchParams }: PageProps<'/contribute/issues'>) {
  redirect(issuesHref(issuesQueryOf(await searchParams)) as never);
}
