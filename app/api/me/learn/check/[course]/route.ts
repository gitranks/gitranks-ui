import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnCheckSide } from '@/lib/learn/check.data';

/**
 * The signed-in person's run of a course's check, read in the browser once the page is up: `{ check, missing }`, the
 * questions still to answer or the result once the run ended. Null signed out (without asking the API), when Learn
 * is not open to them, and on any failure; `missing` when the course offers no check. Never kept: every answer
 * changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { course } = (await params) as { course: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const side = viewer ? await loadLearnCheckSide(viewer, course) : { check: null, missing: false };
  return NextResponse.json(side, { headers: { 'Cache-Control': 'private, no-store' } });
});
