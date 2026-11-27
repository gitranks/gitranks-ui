import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadBuildBar } from '@/lib/build/build-bar.data';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';

/**
 * Build's bar for the signed-in person, read in the browser after the page is up: `{ bar }`, null signed out (without
 * asking the API), when Build is not open to them, and on any failure. Never kept: a test taken changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  return buildReadResponse('bar', viewer ? await loadBuildBar(viewer) : null);
});
