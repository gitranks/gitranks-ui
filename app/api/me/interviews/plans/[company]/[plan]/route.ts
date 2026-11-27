import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { loadInterviewPlanMine } from '@/lib/interviews/plan-mine.data';

/**
 * One plan for the signed-in person, read in the browser after the plan's page is up: `{ mine }`, where they stand in
 * each round and item. Null signed out (without asking the API), when Interviews is not open to them, and on any
 * failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { company, plan } = (await params) as { company: string; plan: string };
  const viewer = interviewsViewerOf(req);
  return interviewsReadResponse('mine', viewer ? await loadInterviewPlanMine(viewer, company, plan) : null);
});
