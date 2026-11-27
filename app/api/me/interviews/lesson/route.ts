import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { isLessonPlace, planQueryOf } from '@/lib/interviews/lesson-in-plan';
import { loadLessonInPlan } from '@/lib/interviews/lesson-in-plan.data';

/**
 * A lesson opened from a plan, read in the browser after Learn's lesson page is up: `{ lesson }`, the plan, the round
 * and the part that hold it, while the person's plan is in progress. Null signed out and for a query not of slugs
 * (without asking the API), when Interviews is not open to them, when the plan does not hold the lesson, and on any
 * failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = interviewsViewerOf(req);
  const query = req.nextUrl.searchParams;
  const address = planQueryOf(`${query.get('company') ?? ''}/${query.get('plan') ?? ''}`);
  const lesson = { slug: query.get('lesson'), course: query.get('course'), group: query.get('group') };
  if (!viewer || !address || !isLessonPlace(lesson)) return interviewsReadResponse('lesson', null);
  return interviewsReadResponse('lesson', await loadLessonInPlan(viewer, address, lesson));
});
