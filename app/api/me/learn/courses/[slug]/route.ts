import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { checkFirstOf, courseNotStartedOf } from '@/lib/learn/course';
import { loadLearnLevel } from '@/lib/learn/course.data';
import { loadLearnCourseMine } from '@/lib/learn/lesson-page.data';
import { CHECK_FIRST_QUERY } from '@/lib/learn/paths';
import { loadLearnMainLanguage } from '@/lib/learn/setup.data';

/**
 * The signed-in person's side of a course, read in the browser after a page of the course is up: `{ course,
 * checkFirst, mainLanguage }`, their side whole, whether the check leads the page, and their setup's main language
 * (the one the course's examples open in). Only an ask with `?check=1`, the course's page, reads the main language
 * and the level, the level only for a course not started (an experienced developer's starts with the check); a
 * lesson's page never pays for either. Null and false signed out (without asking the API), when Learn is not open to
 * them, and on any failure. Never kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const askCheck = req.nextUrl.searchParams.get(CHECK_FIRST_QUERY) === '1';
  const [course, mainLanguage] = viewer
    ? await Promise.all([loadLearnCourseMine(slug, viewer), askCheck ? loadLearnMainLanguage(viewer) : null])
    : [null, null];
  const checkFirst =
    askCheck && viewer && course && courseNotStartedOf(course)
      ? checkFirstOf(course, await loadLearnLevel(viewer))
      : false;
  return NextResponse.json({ course, checkFirst, mainLanguage }, { headers: { 'Cache-Control': 'private, no-store' } });
});
