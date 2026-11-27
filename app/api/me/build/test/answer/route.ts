import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildWrite } from '@/lib/build/build-route';
import { answerBuildTest } from '@/lib/build/test.data';
import { shownAnswerOf } from '@/lib/build/test-code.data';

/**
 * One answer of a run of the signed-in person's test (`{ run, question, pick }`, `pick` null for "I don't know"):
 * `{ ok, data }` with the run, and with the tenth answer its result (each answer whose question has code carrying it
 * highlighted); `{ ok: false, error }` otherwise (`CONFLICT` for a question answered already or a run that ended).
 * Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return buildWrite(req, async (githubLogin, body) => shownAnswerOf(await answerBuildTest(githubLogin, body)));
});
