import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { NO_LESSON_REAL } from '@/lib/learn/real-issues';
import { loadLessonRealMine } from '@/lib/learn/real-issues.data';

/**
 * What "In the real world" under a lesson adds for the signed-in person, read in the browser after the lesson's page
 * is up: `{ real, rows, reads, fixes }` (their fix that uses the lesson and the first issue of their list for it, the
 * masked rows of their list for the lesson with what the rows need, and the lesson's merged fixes). Each null signed
 * out (without asking the API), when Learn is not open to them, when the API does not answer it yet, and on any
 * failure. Never kept: a fix or a skip changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const answer = viewer ? await loadLessonRealMine(slug, viewer).catch(() => NO_LESSON_REAL) : NO_LESSON_REAL;
  return NextResponse.json(answer, { headers: { 'Cache-Control': 'private, no-store' } });
});
