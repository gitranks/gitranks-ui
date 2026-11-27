import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildStart } from '@/lib/build/start.data';

/**
 * The start flow's state for the signed-in person, read again while the page waits: `{ start }`, whether an agent of
 * theirs connected and their build of the project (`?project=`) once started. Null signed out (without asking the
 * API), when Build is not open to them, and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  const project = req.nextUrl.searchParams.get('project') || null;
  return buildReadResponse('start', viewer ? await loadBuildStart(viewer, project) : null);
});
