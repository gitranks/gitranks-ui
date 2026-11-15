import { bodyOf, callDailyUpdates, json, notSignedIn, viewerOf } from '../api-call';
import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import type { DailyUpdatesPickResult, DailyUpdatesRemoveResult } from '@/types/daily-updates.types';
import { parseRepoParams } from '@/utils/repo-paths';

/** The repository the body names, as `{ owner, name }`, or `null`. */
async function repoOf(req: Request) {
  const body = await bodyOf(req);
  const { owner, name } = body ?? {};
  return typeof owner === 'string' && typeof name === 'string' ? parseRepoParams(owner, name) : null;
}

/** Picks a repository to update every day. */
export const POST = auth(async function POST(req: AuthRequest) {
  const githubLogin = viewerOf(req);
  if (!githubLogin) {
    return notSignedIn();
  }

  const repo = await repoOf(req);
  if (!repo) {
    return json({ message: 'Invalid repository' }, 400);
  }

  const answer = await callDailyUpdates<DailyUpdatesPickResult>(githubLogin, '/daily-updates/picks', 'POST', repo);
  return answer.ok ? json(answer.body) : json({ message: 'The pick failed' }, answer.status);
});

/** Removes one of the visitor's picks. */
export const DELETE = auth(async function DELETE(req: AuthRequest) {
  const githubLogin = viewerOf(req);
  if (!githubLogin) {
    return notSignedIn();
  }

  const repo = await repoOf(req);
  if (!repo) {
    return json({ message: 'Invalid repository' }, 400);
  }

  const answer = await callDailyUpdates<DailyUpdatesRemoveResult>(
    githubLogin,
    '/daily-updates/picks/remove',
    'POST',
    repo,
  );
  return answer.ok ? json(answer.body) : json({ message: 'The pick was not removed' }, answer.status);
});
