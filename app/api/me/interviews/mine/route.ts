import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { loadInterviewsMine } from '@/lib/interviews/mine.data';

/**
 * My interviews for the signed-in person, read in the browser: `{ mine }`, the plans in progress and the finished
 * ones. Null signed out (without asking the API), when Interviews is not open to them, and on any failure. Never
 * kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = interviewsViewerOf(req);
  return interviewsReadResponse('mine', viewer ? await loadInterviewsMine(viewer) : null);
});
