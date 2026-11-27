import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildMine } from '@/lib/build/mine.data';

/**
 * My builds for the signed-in person, read in the browser: `{ mine }`, the tests that wait, the builds in progress and
 * the built ones. Null signed out (without asking the API), when Build is not open to them, and on any failure. Never
 * kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  return buildReadResponse('mine', viewer ? await loadBuildMine(viewer) : null);
});
