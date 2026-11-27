import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildWrite } from '@/lib/build/build-route';
import { startBuildTest } from '@/lib/build/test.data';
import { shownStartOf } from '@/lib/build/test-code.data';

/**
 * Starts a run of the signed-in person's test (`{ project, kind, language }`), or answers the open one as it is: `{ ok,
 * data }` with the run's questions (each with code carrying it highlighted), or `{ ok: false, error }` (`CONFLICT`
 * when the test is not open now). Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return buildWrite(req, async (githubLogin, body) => shownStartOf(await startBuildTest(githubLogin, body)));
});
