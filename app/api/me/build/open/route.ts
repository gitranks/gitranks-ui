import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildOpenWithin } from '@/lib/build/build-gate';
import { BUILD_NO_STORE, buildViewerOf } from '@/lib/build/build-route';

/**
 * Whether GitRanks Build is open to the signed-in person (the API's `buildOpen`), for what the site draws around Build:
 * `{ open }`. Closed signed out (without asking the API), when the API says no, and on any failure, an API that does
 * not know Build yet included, and a slow one (the proxy's time limit). Never kept: the browser may change account.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  const open = viewer ? await buildOpenWithin(viewer) : false;
  return NextResponse.json({ open }, { headers: BUILD_NO_STORE });
});
