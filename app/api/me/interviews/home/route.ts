import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { loadInterviewsMyHome } from '@/lib/interviews/my-home.data';

/**
 * The signed-in person's plans in progress, read in the browser after the page is up (a company's page, Interviews
 * home): `{ home }`, null signed out (without asking the API), when Interviews is not open to them, and on any
 * failure. Never kept: a lesson learned changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = interviewsViewerOf(req);
  return interviewsReadResponse('home', viewer ? await loadInterviewsMyHome(viewer) : null);
});
