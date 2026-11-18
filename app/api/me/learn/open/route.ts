import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { learnOpenFor } from '@/lib/learn/learn-gate';

/**
 * Whether GitRanks Learn is open to the viewer, for the site menu: `{ open }`. Signed in, the API's answer for them;
 * signed out, whether it is open to everyone (its front door is then open to visitors).
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const open = viewer ? await learnOpenFor(viewer) : await learnOpenToEveryone();
  return NextResponse.json({ open }, { headers: { 'Cache-Control': 'private, max-age=60' } });
});
