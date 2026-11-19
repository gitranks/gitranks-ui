import { notFound, redirect } from 'next/navigation';

import { LearnStart } from './learn-start-screen';
import { loadLearnOpen, loadLearnProfile, loadOwnAgent } from '@/lib/learn/learn.data';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import {
  learnGoalLabelOf,
  learnStartConnectionOf,
  learnStartIssueOf,
  learnStartLessonAttemptOf,
} from '@/lib/learn/learn-start';
import { learnStartOnboarded, learnStartViewOf } from '@/lib/learn/learn-start.data';
import type { LearnStartView as LearnStartAnswer } from '@/lib/learn/learn-start.types';
import { ContributeUnavailableError, viewerLogin } from '@/lib/workspace/contribute.data';
import { contributeMcpSignIn } from '@/lib/workspace/mcp-sign-in';
import { learnAttemptPath } from '@/lib/workspace/paths';

/** An issue the API would not take as named: the page says it can't be started here, as for one it won't show. */
const unavailable = (repo: string, number: number): LearnStartAnswer => ({
  start: { repo, number, issue: null, refusal: 'UNAVAILABLE', limit: null, attempt: null },
  current: null,
  openPrs: null,
});

/**
 * The start page for one issue, read per request. Behind Learn's gate: not found for anyone Learn is not open to, and
 * for an address that names no issue. With no saved goal it goes to Learn home, where the goal comes first; with the
 * viewer's own Learn attempt on the issue, to that attempt's lesson page.
 */
export async function LearnStartView({ params }: { params: Promise<{ owner: string; repo: string; number: string }> }) {
  const { owner, repo, number } = await params;
  const issue = learnStartIssueOf(owner, repo, number);
  const githubLogin = await viewerLogin();
  if (!githubLogin) notFound();
  const [open, profile] = await Promise.all([loadLearnOpen(), loadLearnProfile()]);
  if (!open || !issue) notFound();
  const goal = learnGoalLabelOf(profile);
  if (!goal) redirect(LEARN_PATH);

  const reader = { source: 'ssr' as const, githubLogin };
  const [answer, ownAgent, onboarded, signIn] = await Promise.all([
    learnStartViewOf(reader, issue.repo, issue.number),
    loadOwnAgent(),
    learnStartOnboarded(reader),
    contributeMcpSignIn(),
  ]);
  if (!answer.ok) {
    // Not open to the viewer, or an API that doesn't answer it yet: as Learn's other reads do, the page isn't there.
    if (answer.error === 'NOT_FOUND' || answer.error === 'SIGNED_OUT' || answer.error === 'NOT_AVAILABLE_YET') {
      notFound();
    }
    if (answer.error !== 'INVALID') throw new ContributeUnavailableError();
  }
  const view = answer.ok ? answer.data : unavailable(issue.repo, issue.number);
  const lesson = learnStartLessonAttemptOf(view);
  if (lesson) redirect(learnAttemptPath(lesson.id));

  const tokens = ownAgent?.tokens;
  return (
    <LearnStart
      repo={issue.repo}
      number={issue.number}
      goal={goal}
      initial={view}
      connection={learnStartConnectionOf(tokens)}
      onboarded={onboarded}
      tokens={tokens}
      signIn={signIn}
      openedAt={new Date().toISOString()}
    />
  );
}
