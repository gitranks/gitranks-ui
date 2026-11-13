import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { learnOpenFor } from '@/lib/learn/learn-gate';

/** Whether GitRanks Learn is open to the signed-in viewer, for the site menu: `{ open }`, closed signed out. */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const open = viewer ? await learnOpenFor(viewer) : false;
  return NextResponse.json({ open }, { headers: { 'Cache-Control': 'private, max-age=60' } });
});
