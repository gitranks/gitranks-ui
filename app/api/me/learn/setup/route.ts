import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnSetup } from '@/lib/learn/setup.data';

/**
 * The signed-in person's setup, read in the browser once the page is up, and again while our guess runs:
 * `{ setup, signedOut }`. Null when Learn is not open to them and on any failure; null with `signedOut` when there is
 * no session or it needs a new sign-in (without asking the API), so the page asks to sign in rather than to try again.
 * Never kept: our guess and a save change it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const setup = viewer ? await loadLearnSetup(viewer) : null;
  return NextResponse.json({ setup, signedOut: !viewer }, { headers: { 'Cache-Control': 'private, no-store' } });
});
