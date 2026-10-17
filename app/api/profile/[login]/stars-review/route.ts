import { NextResponse } from 'next/server';

import type { AuthRequest } from '../route';
import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';
import { isGithubLogin } from '@/utils/profile-refresh';

/** Answers the page reads, passed on as they came; any other answer becomes a bare failure. */
const PASSED_STATUSES = new Set([200, 403, 404, 409]);

const passOn = async (response: Response) => {
  if (!PASSED_STATUSES.has(response.status)) {
    return NextResponse.json({ message: 'Stars review request failed' }, { status: response.status });
  }

  const responseData = await response.json().catch(() => null);

  return NextResponse.json(responseData, { status: response.status });
};

/** The profile owner's view of the review of their stars. */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  if (!req.auth) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { login } = await params;

  if (!isGithubLogin(login)) {
    return NextResponse.json({ message: 'Invalid login' }, { status: 400 });
  }

  const response = await signedFetch(`/user/stars-review/${login}`, {}, 'client', req.auth.user.githubLogin);

  return passOn(response);
});

/** The profile owner reports that the review is a mistake. */
export const POST = auth(async function POST(req: AuthRequest, { params }) {
  if (!req.auth) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { login } = await params;

  if (!isGithubLogin(login)) {
    return NextResponse.json({ message: 'Invalid login' }, { status: 400 });
  }

  const response = await signedFetch(
    '/user/stars-review/report',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login }),
    },
    'client',
    req.auth.user.githubLogin,
  );

  return passOn(response);
});
