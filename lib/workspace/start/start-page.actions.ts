'use server';

import { learnStartNumberOf, learnStartRepoOf } from './start-page';
import { startPageAttemptOf, startPageViewOf } from './start-page.data';
import type { StartMode, StartPageAttempt, StartPageIssueView } from './start-page.types';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { ContributeActionResult } from '@/lib/workspace/errors';

const invalid = (): ContributeActionResult<never> => ({ ok: false, error: 'INVALID' });

/**
 * The Start page asks again whether the issue can be started in its mode: once the agent has connected, after Resume,
 * and on Check again. As the session's user, for an issue named the way the page's address names it.
 */
export async function readStartPageIssue(
  repo: string,
  number: number,
  mode: StartMode,
): Promise<ContributeActionResult<StartPageIssueView>> {
  const name = learnStartRepoOf(repo);
  const value = learnStartNumberOf(number);
  if (!name || !value || (mode !== 'fix' && mode !== 'lesson')) return invalid();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  return startPageViewOf({ source: 'client', githubLogin }, name, value, mode);
}

/** Step 3's ask, once on each change of the viewer's attempts: their newest live attempt on the issue, or null. */
export async function readStartPageAttempt(
  repo: string,
  number: number,
): Promise<ContributeActionResult<StartPageAttempt | null>> {
  const name = learnStartRepoOf(repo);
  const value = learnStartNumberOf(number);
  if (!name || !value) return invalid();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  return startPageAttemptOf({ source: 'client', githubLogin }, name, value);
}
