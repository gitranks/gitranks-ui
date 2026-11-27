import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildProjectsMine } from '@/lib/build/projects.data';

/**
 * The signed-in person's builds of every project they touched, for their place on each card: `{ builds }`. Null signed
 * out (without asking the API), when Build is not open to them, and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  return buildReadResponse('builds', viewer ? await loadBuildProjectsMine(viewer) : null);
});
