import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnLessonMine } from '@/lib/learn/lesson-page.data';

/**
 * The signed-in person's side of a lesson, read in the browser after the lesson's page is up: `{ mine }`, null signed
 * out (without asking the API), when Learn is not open to them, and on any failure. Never kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const mine = viewer ? await loadLearnLessonMine(slug, viewer) : null;
  return NextResponse.json({ mine }, { headers: { 'Cache-Control': 'private, no-store' } });
});
