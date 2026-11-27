import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildSettings } from '@/lib/build/settings.data';

/**
 * The signed-in person's Build settings (`{ settings }`): whether Build's reminders are on. Null signed out (without
 * asking the API), for a person with no build yet, when Build is not open to them, and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  return buildReadResponse('settings', viewer ? await loadBuildSettings(viewer) : null);
});
