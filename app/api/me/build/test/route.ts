import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { buildTestOf, loadBuildTest } from '@/lib/build/test.data';
import { shownTestOf } from '@/lib/build/test-code.data';

/**
 * The signed-in person's test of a project's build (`?project=&kind=end|gold&language=`), read in the browser: `{ test
 * }`, the run in progress and the last result (each question with code carrying it highlighted, unless `plain=1`:
 * a box outside the test, which draws no code), and whether a run can start. Reading writes nothing. Null signed out (without asking the API), for an ask not of the shape, when Build is
 * not open to them, and on any failure. Never kept: every answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  const query = req.nextUrl.searchParams;
  const test = buildTestOf({ project: query.get('project'), kind: query.get('kind'), language: query.get('language') });
  if (!viewer || !test) return buildReadResponse('test', null);
  const read = await loadBuildTest(viewer, test);
  return buildReadResponse('test', query.get('plain') === '1' ? read : await shownTestOf(read));
});
