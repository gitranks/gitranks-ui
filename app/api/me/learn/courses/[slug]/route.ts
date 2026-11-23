import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { checkFirstOf, courseNotStartedOf } from '@/lib/learn/course';
import { loadLearnLevel } from '@/lib/learn/course.data';
import { loadLearnCourseMine } from '@/lib/learn/lesson-page.data';

/**
 * The signed-in person's side of a course, read in the browser after a page of the course is up: `{ course,
 * checkFirst }`, their side whole and whether the check leads the page (a course not started, for an experienced
 * developer: their level is read only then). Null and false signed out (without asking the API), when Learn is not
 * open to them, and on any failure. Never kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const course = viewer ? await loadLearnCourseMine(slug, viewer) : null;
  const checkFirst =
    viewer && course && courseNotStartedOf(course) ? checkFirstOf(course, await loadLearnLevel(viewer)) : false;
  return NextResponse.json({ course, checkFirst }, { headers: { 'Cache-Control': 'private, no-store' } });
});
