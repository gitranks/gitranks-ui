import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { buildZoneOf } from '@/lib/build/zone';
import { loadBuildTimeZone } from '@/lib/build/zone.data';

/**
 * The time zone the signed-in person's days are counted in, read in the browser: `{ zone }`, the zone they saved, or
 * the API's default when they saved none. Null signed out (without asking the API), and when it cannot be read: the
 * page then writes dates in the browser's zone. Never kept: a save changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  if (!viewer) return buildReadResponse('zone', null);
  const saved = await loadBuildTimeZone(viewer);
  return buildReadResponse('zone', saved ? buildZoneOf(saved.timeZone) : null);
});
