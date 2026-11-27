import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsWrite } from '@/lib/interviews/interviews-route';
import { reportInterviewFact } from '@/lib/interviews/report.data';

/**
 * Sends one "This is wrong" for the signed-in person (`{ company, plan, fact, note }`): `{ ok, data }`, or
 * `{ ok: false, error }` (`LIMITED`, 429, past the day's limit). Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return interviewsWrite(req, reportInterviewFact);
});
