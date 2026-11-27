import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildWrite } from '@/lib/build/build-route';
import { removeBuild } from '@/lib/build/mine.data';

/**
 * Removes one of the signed-in person's builds in progress (`{ build }`): `{ ok, data }`, or `{ ok: false, error }`
 * (`INVALID` for a built one, which cannot be removed). Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return buildWrite(req, (viewer, body) => removeBuild(viewer, body.build));
});
