import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { ApproveView } from './approve-view';
import { gate, type PageParams, pageOf, pagePathOf, paramOf, type Query, Unavailable } from './page-read';
import { PlayerStrip } from '@/components/workspace/player/player-strip';
import { LEARN_PULL_REQUESTS_PATH, learnLessonPath } from '@/lib/learn/paths';
import { ownAgentChangesOf } from '@/lib/workspace/attempt-format';
import { RESUME_PARAM } from '@/lib/workspace/grant-resume';
import {
  pullRequestApprovePath,
  pullRequestPath,
  pullRequestWalkthroughPath,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';
import { loadPullRequestApproval, pullRequestRefOf } from '@/lib/workspace/pull-request.data';

/**
 * Approve and send, for the issue's newest fix: what the person sends and the change, and the one card. A fix that
 * does not wait for its approval (sent already, still being written, not theirs) opens the pull request's page.
 */
export async function ApprovePageScreen({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Query>;
}) {
  const [query, route] = await Promise.all([searchParams, params]);
  const gated = await gate({ path: pagePathOf(route, 'approve'), query });
  if (!gated) return null;
  const read = await pageOf(params);
  if (read.kind === 'unread') return <Unavailable />;
  if (read.kind === 'move') {
    const resume = paramOf(query, RESUME_PARAM);
    const to = pullRequestApprovePath(read.ref);
    redirect((resume ? `${to}?${new URLSearchParams({ [RESUME_PARAM]: resume })}` : to) as Route);
  }
  const { first, base } = read;
  const refInput = pullRequestRefOf(read.repo, read.issue, first.attemptId);
  const approval = await loadPullRequestApproval(refInput);
  if (approval === undefined) return <Unavailable />;
  if (approval === null) redirect(base);

  const made = first.mode === 'LEARN' ? 'LEARN' : 'CONTRIBUTE';
  const ref = { repo: read.repo, issue: read.issue };
  const issueTitle = first.title?.trim() || `${read.repo} #${read.issue}`;
  const lesson = approval.lessonLater ? learnLessonPath(approval.lessonLater.slug) : null;
  return (
    <>
      <PlayerStrip
        crumbs={[
          { label: 'Pull requests', href: made === 'LEARN' ? LEARN_PULL_REQUESTS_PATH : WORKSPACE_PATHS.pullRequests },
          { label: `${read.repo} #${read.issue}`, href: pullRequestPath(ref) },
          { label: 'Approve and send' },
        ]}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-8 pb-16">
        <ApproveView
          refInput={refInput}
          attemptId={first.attemptId}
          page={base}
          approvePath={pullRequestApprovePath(ref)}
          resume={paramOf(query, RESUME_PARAM)}
          sendBack={ownAgentChangesOf(first) && (first.sendBacksLeft ?? 0) > 0}
          made={made}
          repo={read.repo}
          issueNumber={read.issue}
          issueTitle={issueTitle}
          approval={approval}
          patch={first.patch}
          links={{
            back: base,
            walkthrough: made === 'LEARN' ? pullRequestWalkthroughPath(ref) : null,
            answers: made === 'LEARN' ? pullRequestWalkthroughPath(ref) : null,
            lesson,
          }}
        />
      </main>
    </>
  );
}
