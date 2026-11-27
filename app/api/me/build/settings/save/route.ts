import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildWrite } from '@/lib/build/build-route';
import { saveBuildSettings } from '@/lib/build/settings.data';

/**
 * Turns the signed-in person's Build reminders on or off (`{ reminders }`): `{ ok, data }` with the settings as saved,
 * or `{ ok: false, error }`. Never kept.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  return buildWrite(req, saveBuildSettings);
});
