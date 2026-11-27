import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildWrite } from '@/lib/build/build-route';
import { answerBuildTest } from '@/lib/build/test.data';

/**
 * One answer of a run of the signed-in person's test (`{ run, question, pick }`, `pick` null for "I don't know"):
 * `{ ok, data }` with the run, and with the tenth answer its result; `{ ok: false, error }` otherwise (`CONFLICT` for
 * a question answered already or a run that ended). Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return buildWrite(req, answerBuildTest);
});
