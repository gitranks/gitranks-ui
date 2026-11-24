import { notFound, redirect } from 'next/navigation';

import { ProgressScreen } from './progress-screen';
import {
  lastPageOf,
  progressPageOf,
  progressPath,
  progressTotalOf,
  progressViewOf,
} from '@/lib/learn/progress/progress';
import { loadLearnProgress, loadProgressList } from '@/lib/learn/progress/progress.data';
import type { ProgressShare } from '@/lib/learn/progress/progress.types';
import { loadPullRequestsPage, viewerLogin } from '@/lib/workspace/contribute.data';
import { notEnteredTargetOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

type Search = Record<string, string | string[] | undefined>;

/**
 * Your progress, read per request. The workspace's layout has asked a visitor to sign in and sent an account being set
 * up home; here an account the workspace is hidden from gets the 404 (the page never names Learn to it), and one that has not
 * entered the workspace goes to Contribute's home, which starts them. A page past the last goes to the last.
 */
export async function ProgressView({
  searchParams,
  loadShare,
}: {
  searchParams: Promise<Search>;
  /** Share, from the Skills page of the login signed in: read per request, null when it could not be read. */
  loadShare: (login: string) => Promise<ProgressShare | null>;
}) {
  const search = await searchParams;
  const view = progressViewOf(search.view);
  const page = progressPageOf(search.page);
  // The reads answer, never throw: started with the gate's, used once it lets the viewer in.
  const progressRead = loadLearnProgress();
  const listRead = loadProgressList(view, page);
  const gate = await loadWorkspaceGate();
  // The layout's sign-in shows instead.
  if (gate.kind === 'signed-out') return null;
  if (gate.kind === 'setting-up') redirect(WORKSPACE_PATHS.contribute);
  if (gate.kind !== 'open') notFound();
  if (!gate.entered) redirect(notEnteredTargetOf(WORKSPACE_PATHS.progress) ?? WORKSPACE_PATHS.contribute);

  const progress = await progressRead;
  if (progress === null) notFound();
  const counts = progress?.counts;
  if (!counts) return <ProgressScreen view={view} page={1} counts={counts} />;
  // Nothing passed: the way to a first lesson, and on the first view what was started and not finished (a practice
  // lesson to continue, an attempt that ended), which the API answers with no pass too.
  if (counts.lessonsPassed === 0) {
    const started = view === 'lessons' ? await listRead : undefined;
    return <ProgressScreen view={view} page={1} counts={counts} list={started ?? undefined} />;
  }

  const list = await listRead;
  if (list === null) notFound();
  // Share: the Skills page of the login the viewer is signed in with, read beside the count of open pull requests.
  const login = await viewerLogin();
  const shareRead = login ? loadShare(login) : Promise.resolve(null);
  const last = list ? lastPageOf(progressTotalOf(list)) : page;
  if (page > last) redirect(progressPath({ view, page: last }));
  // No merged pull request yet: how many are open now, the Pull requests tab's own count.
  const noneMerged = (view === 'merged' || view === 'repos') && counts.prsMerged === 0;
  const openPrs = noneMerged
    ? ((await loadPullRequestsPage({ page: 1, state: 'OPEN', mode: 'LEARN' }))?.total ?? null)
    : undefined;
  return (
    <ProgressScreen view={view} page={page} counts={counts} list={list} openPrs={openPrs} share={await shareRead} />
  );
}
