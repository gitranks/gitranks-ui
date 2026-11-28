import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildDoors } from '@/lib/build/doors.data';

/**
 * The doors into Build for a course (`?course=`) or for the course of an issue's lesson (`?lesson=`): `{ doors }`, the
 * projects that name the course and the signed-in person's builds of them. Null signed out (without asking the API),
 * and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  const query = req.nextUrl.searchParams;
  return buildReadResponse(
    'doors',
    viewer ? await loadBuildDoors(viewer, { course: query.get('course'), lesson: query.get('lesson') }) : null,
  );
});
