import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsWrite } from '@/lib/interviews/interviews-route';
import { stopInterviewPlan } from '@/lib/interviews/plan-mine.data';

/**
 * Stops a plan for the signed-in person (`{ company, plan, reason }`, the reason null when skipped): `{ ok, data }`
 * with the plan for them, or `{ ok: false, error }`. Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return interviewsWrite(req, stopInterviewPlan);
});
