import { type NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';

export type AuthRequest = NextRequest & { auth: Session | null };

export const POST = auth(async function POST(req: AuthRequest, { params }) {
  if (!req.auth) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { login } = await params;
  const { user } = req.auth;

  const response = await signedFetch('/user/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userLogin: user.githubLogin,
      loginToFetch: login,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    return NextResponse.json({ message: 'Failed to fetch user', error: responseData }, { status: response.status });
  }

  return NextResponse.json(responseData);
});
