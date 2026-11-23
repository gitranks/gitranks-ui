import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { isLearnDay } from '@/lib/learn/my-progress';
import { loadLearnHistory } from '@/lib/learn/my-progress.data';

/**
 * A page of the signed-in person's History, read in the browser: `{ history, signedOut }`, the days before `?before=`
 * (a date such as `2026-11-20`; none, the newest). A `before` that is not a date is refused with 400, without asking the
 * API. Null when Learn is not open to them and on any failure; null with `signedOut` when there is no session or it
 * needs a new sign-in. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const before = req.nextUrl.searchParams.get('before') || null;
  if (before !== null && !isLearnDay(before)) {
    return NextResponse.json({ history: null, signedOut: false }, { status: 400, headers });
  }
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const history = viewer ? await loadLearnHistory(viewer, before) : null;
  return NextResponse.json({ history, signedOut: !viewer }, { headers });
});
