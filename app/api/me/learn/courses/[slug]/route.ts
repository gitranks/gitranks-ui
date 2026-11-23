import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnCourseMine } from '@/lib/learn/lesson-page.data';

/**
 * The signed-in person's side of a course, read in the browser after a page of the course is up: `{ course }`, each
 * lesson's depth; null signed out (without asking the API), when Learn is not open to them, and on any failure. Never
 * kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const course = viewer ? await loadLearnCourseMine(slug, viewer) : null;
  return NextResponse.json({ course }, { headers: { 'Cache-Control': 'private, no-store' } });
});
