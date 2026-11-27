import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsOpenWithin } from '@/lib/interviews/interviews-gate';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { loadInterviewsForCourse } from '@/lib/interviews/learn.data';
import { isInterviewSlug } from '@/lib/interviews/paths';

/**
 * What one Learn course's pages show of Interviews, for a person Interviews is open to, read in the browser after the
 * page is up: `{ course }`, the public answer for the course (the companies whose plans use it, the topics candidates
 * report by group, and a company's own course). Null signed out (without asking the API), when Interviews is not open
 * to them, for a slug that is not one, and on any failure. Never kept: it answers only for this person.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { course } = (await params) as { course: string };
  const viewer = interviewsViewerOf(req);
  if (!viewer || !isInterviewSlug(course) || !(await interviewsOpenWithin(viewer))) {
    return interviewsReadResponse('course', null);
  }
  return interviewsReadResponse('course', await loadInterviewsForCourse(course).catch(() => null));
});
