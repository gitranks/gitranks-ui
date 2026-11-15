import { revalidateTag } from 'next/cache';

import { bodyOf, callDailyUpdates, json, notSignedIn, tooLarge, viewerOf } from './api-call';
import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import type { DailyUpdatesStartResult, DailyUpdatesViewer } from '@/types/daily-updates.types';
import { isGithubLogin, profileCacheTag } from '@/utils/profile-refresh';

/** The signed-in visitor's daily updates: whether they are open to them, on, and their picks. */
export const GET = auth(async function GET(req: AuthRequest) {
  const githubLogin = viewerOf(req);
  if (!githubLogin) {
    return notSignedIn();
  }

  const answer = await callDailyUpdates<DailyUpdatesViewer>(githubLogin, '/daily-updates/me', 'GET');
  return answer.ok ? json(answer.body) : json({ message: 'Failed to load daily updates' }, answer.status);
});

/** Starts daily updates of the visitor's own profile: the API checks the star and refreshes it when it can. */
export const POST = auth(async function POST(req: AuthRequest) {
  const githubLogin = viewerOf(req);
  if (!githubLogin) {
    return notSignedIn();
  }

  const body = await bodyOf(req);
  if (body === 'too-large') {
    return tooLarge();
  }
  const login = body?.login;
  if (!isGithubLogin(login)) {
    return json({ message: 'Bad login' }, 400);
  }

  const answer = await callDailyUpdates<DailyUpdatesStartResult>(githubLogin, '/daily-updates/start', 'POST', {
    login,
  });
  if (!answer.ok) {
    return json({ message: 'Daily updates could not start' }, answer.status);
  }

  // The profile may be fetching now and is on daily updates: a reload shows both instead of the cached page.
  if (answer.body.status === 'started') {
    revalidateTag(profileCacheTag(login), { expire: 0 });
  }

  return json(answer.body);
});
