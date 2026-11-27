import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadInterviewsBar } from '@/lib/interviews/interviews-bar.data';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';

/**
 * Interviews' bar for the signed-in person, read in the browser after the page is up: `{ bar }`, null signed out
 * (without asking the API), when Interviews is not open to them, and on any failure. Never kept: a plan started
 * changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = interviewsViewerOf(req);
  return interviewsReadResponse('bar', viewer ? await loadInterviewsBar(viewer) : null);
});
