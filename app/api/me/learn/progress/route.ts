import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnMyProgress } from '@/lib/learn/my-progress.data';

/**
 * The signed-in person's progress, read in the browser once My progress is up: `{ progress, signedOut }`. Null when
 * Learn is not open to them and on any failure; null with `signedOut` when there is no session or it needs a new
 * sign-in (without asking the API), so the page asks to sign in rather than to try again. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const progress = viewer ? await loadLearnMyProgress(viewer) : null;
  return NextResponse.json({ progress, signedOut: !viewer }, { headers: { 'Cache-Control': 'private, no-store' } });
});
