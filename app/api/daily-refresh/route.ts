import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';
import type { DailyRefreshResult, DailyRefreshStatus } from '@/types/daily-refresh.types';
import { isGithubLogin, profileCacheTag } from '@/utils/profile-refresh';

const signedInLogin = (req: AuthRequest) => req.auth?.user.githubLogin;

/** Whether the signed-in user's refresh of the day is still unused. */
export const GET = auth(async function GET(req: AuthRequest) {
  const githubLogin = signedInLogin(req);
  if (!githubLogin) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const response = await signedFetch('/daily-refresh/status', {}, 'client', githubLogin);
  if (!response.ok) {
    return NextResponse.json({ message: 'Failed to load the daily refresh' }, { status: response.status });
  }

  return NextResponse.json((await response.json()) as DailyRefreshStatus);
});

/** Checks the star with GitHub, live, and starts the refresh of the user's own profile when it is there. */
export const POST = auth(async function POST(req: AuthRequest) {
  const githubLogin = signedInLogin(req);
  if (!githubLogin) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const login: unknown = body?.login;
  if (!isGithubLogin(login)) {
    return NextResponse.json({ message: 'Bad login' }, { status: 400 });
  }

  const response = await signedFetch(
    '/daily-refresh',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login }),
    },
    'client',
    githubLogin,
  );

  if (!response.ok) {
    return NextResponse.json({ message: 'The star check failed' }, { status: response.status });
  }

  const result = (await response.json()) as DailyRefreshResult;

  // The fetch is now under way, so a reload shows its progress instead of the cached profile.
  if (result.status === 'started') {
    revalidateTag(profileCacheTag(login), { expire: 0 });
  }

  return NextResponse.json(result);
});
