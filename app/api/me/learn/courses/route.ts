import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnCoursesMine } from '@/lib/learn/course.data';

/**
 * The signed-in person's side of all courses, read in the browser after the list is up: `{ mine }`, their courses and
 * each lesson's depth in them. Null signed out (without asking the API), when Learn is not open to them, and on any
 * failure. Never kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const mine = viewer ? await loadLearnCoursesMine(viewer) : null;
  return NextResponse.json({ mine }, { headers: { 'Cache-Control': 'private, no-store' } });
});
