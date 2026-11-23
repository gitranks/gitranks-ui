import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnReviewSide } from '@/lib/learn/review.data';

/**
 * The signed-in person's review, read in the browser once the page is up: `{ review, signedOut }`, today's set of one
 * course (`?course=<slug>`) or of every course, and where to go once it is done. Null when Learn is not open to them
 * and on any failure; null with `signedOut` when there is no session or it needs a new sign-in (without asking the
 * API), so the page asks to sign in rather than to try again. Never kept: every answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const course = req.nextUrl.searchParams.get('course');
  const review = viewer ? await loadLearnReviewSide(viewer, course) : null;
  return NextResponse.json({ review, signedOut: !viewer }, { headers: { 'Cache-Control': 'private, no-store' } });
});
