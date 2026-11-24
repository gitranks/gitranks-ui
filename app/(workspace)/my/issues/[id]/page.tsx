import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { IssuePageLive } from '@/components/workspace/masked-issue/issue-page-live';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadLearnProfile } from '@/lib/learn/learn.data';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { loadIssuePageLearn } from '@/lib/workspace/issue-page-learn.data';
import {
  ISSUE_LOOK_PARAM,
  issuePageBackOf,
  issuePageFromOf,
  maskIdOf,
  usesLearnOf,
} from '@/lib/workspace/masked-issue';
import { loadIssueNumbers, loadIssuePage, loadIssueStartReads } from '@/lib/workspace/masked-issue.data';
import { learnIssuesViewOf, searchParamsOf } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: 'An issue', robots: { index: false, follow: false } };

type Params = PageProps<'/my/issues/[id]'>;

/**
 * The page of one issue, by its mask id: the address names no project. The viewer's own, read per request, not indexed
 * and in no sitemap. A visitor is asked to sign in by the layout and comes back here; a press made before the sign-in
 * (`?look=1`) is made on return.
 */
export default function MaskedIssuePage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <IssueView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * The page's reads. An id that names no issue and a viewer the workspace is not open to are both not found. The start
 * form's reads come with the page, since a press shows the form in place.
 */
async function IssueView({ params, searchParams }: Pick<Params, 'params' | 'searchParams'>) {
  const [{ id: raw }, search] = await Promise.all([params, searchParams]);
  const id = maskIdOf(raw);
  if (!id) notFound();
  const gate = await loadWorkspaceGate();
  if (gate.kind !== 'open') notFound();
  const from = issuePageFromOf(search.from);
  const query = searchParamsOf(search);

  // From Contribute, the start form names Learn too when the person uses it: a Learn profile of theirs. With no side
  // in the address, the same read sends the way back to Learn's Issues for a person who saved a Learn profile.
  const usesLearn = from === 'contribute' ? loadLearnProfile().catch(() => null) : null;
  // From Learn, Learn's parts (the lesson and why, kept for learners, how the work started), in a read of their own:
  // without them the page draws what it draws today.
  const learnParts = from === 'learn' ? loadIssuePageLearn(id).catch(() => null) : null;
  const [load, numbers, start, profile, learn] = await Promise.all([
    loadIssuePage(id),
    loadIssueNumbers(),
    loadIssueStartReads(),
    usesLearn,
    learnParts,
  ]);
  if (load.kind === 'not-found') notFound();
  return (
    <IssuePageLive
      id={id}
      page={load.page}
      from={from}
      back={issuePageBackOf(search.from, query, usesLearnOf(profile))}
      view={from === 'learn' ? learnIssuesViewOf(query).toString() : null}
      numbers={numbers}
      openedAt={new Date().toISOString()}
      hosted={gate.agents.hosted}
      start={start}
      alsoLearn={profile !== null}
      returning={search[ISSUE_LOOK_PARAM] === '1'}
      learn={learn}
    />
  );
}
