import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { learnTodayIn } from '@/lib/learn/my-progress';
import { loadLearnMyProgress, loadLearnTimeZone } from '@/lib/learn/my-progress.data';

/**
 * The signed-in person's progress, read in the browser once My progress is up: `{ progress, today, signedOut }`.
 * `today` is today's date as the API counts their days (their saved zone, else Learn's default), null when their zone
 * cannot be read: the page then uses the browser's date. Progress is null when Learn is not open to them and on any
 * failure; null with `signedOut` when there is no session or it needs a new sign-in (without asking the API), so the
 * page asks to sign in rather than to try again. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer) return NextResponse.json({ progress: null, today: null, signedOut: true }, { headers });
  const [progress, zone] = await Promise.all([loadLearnMyProgress(viewer), loadLearnTimeZone(viewer)]);
  const today = progress && zone ? learnTodayIn(new Date(), zone.timeZone) : null;
  return NextResponse.json({ progress, today, signedOut: false }, { headers });
});
