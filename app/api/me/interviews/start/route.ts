import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsWrite } from '@/lib/interviews/interviews-route';
import { startInterviewPlan } from '@/lib/interviews/plan-mine.data';

/**
 * Starts a plan for the signed-in person, or starts a stopped one again (`{ company, plan }`): `{ ok, data }` with the
 * plan for them, or `{ ok: false, error }`. Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return interviewsWrite(req, startInterviewPlan);
});
