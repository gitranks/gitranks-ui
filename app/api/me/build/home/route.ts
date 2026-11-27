import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildHome } from '@/lib/build/home.data';

/**
 * Build's home for the signed-in person, read in the browser: `{ home }`, the builds in progress, the tests that wait
 * and the projects to build next. Null signed out (without asking the API), when Build is not open to them, and on any
 * failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  return buildReadResponse('home', viewer ? await loadBuildHome(viewer) : null);
});
