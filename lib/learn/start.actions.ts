'use server';

import { learnStartNumberOf, learnStartRepoOf } from '@/lib/learn/learn-start';
import { learnStartAttemptOf, learnStartViewOf } from '@/lib/learn/learn-start.data';
import type { LearnStartAttempt, LearnStartView } from '@/lib/learn/learn-start.types';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { ContributeActionResult } from '@/lib/workspace/errors';

const invalid = <T>(): ContributeActionResult<T> => ({
  ok: false,
  error: 'INVALID',
  message: 'That was not accepted.',
});

/**
 * The start page asks again whether the issue can be started: once the agent has connected, and on Check again. As the
 * session's user, for an issue named the way the page's address names it.
 */
export async function readLearnStartIssue(
  repo: string,
  number: number,
): Promise<ContributeActionResult<LearnStartView>> {
  const name = learnStartRepoOf(repo);
  const value = learnStartNumberOf(number);
  if (!name || !value) return invalid();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  return learnStartViewOf({ source: 'client', githubLogin }, name, value);
}

/** Step 3's ask, every 5 seconds while the page is shown: the viewer's newest live attempt on the issue, or null. */
export async function readLearnStartAttempt(
  repo: string,
  number: number,
): Promise<ContributeActionResult<LearnStartAttempt | null>> {
  const name = learnStartRepoOf(repo);
  const value = learnStartNumberOf(number);
  if (!name || !value) return invalid();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  return learnStartAttemptOf({ source: 'client', githubLogin }, name, value);
}
