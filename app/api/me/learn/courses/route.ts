import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { COURSE_DEPTHS_MAX, loadLearnCourseDepths, loadLearnCoursesMine } from '@/lib/learn/course.data';
import { COURSE_DEPTHS_QUERY, isContentSlug } from '@/lib/learn/paths';

const NEVER_KEPT = { headers: { 'Cache-Control': 'private, no-store' } };

/** The courses a depths ask names: each a slug's shape, once, and no more than the cap. */
const depthCoursesOf = (value: string) =>
  [...new Set(value.split(',').filter(isContentSlug))].slice(0, COURSE_DEPTHS_MAX);

/**
 * The signed-in person's side of all courses, read in the browser after the list is up: `{ mine }`, their courses, in
 * one read. With `?depths=<slug>,<slug>`, asked only once a search shows a lesson of a course they started: `{ depths
 * }`, each lesson's depth in those courses. Null signed out (without asking the API), when Learn is not open to them,
 * and on any failure. Never kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const asked = req.nextUrl.searchParams.get(COURSE_DEPTHS_QUERY);
  if (asked !== null) {
    const courses = depthCoursesOf(asked);
    const depths = viewer && courses.length ? await loadLearnCourseDepths(viewer, courses) : null;
    return NextResponse.json({ depths }, NEVER_KEPT);
  }
  const mine = viewer ? await loadLearnCoursesMine(viewer) : null;
  return NextResponse.json({ mine }, NEVER_KEPT);
});
