import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildOpenFor } from '@/lib/build/build-gate';
import { buildViewerOf } from '@/lib/build/build-route';

/**
 * Whether GitRanks Build is open to the signed-in person (the API's `buildOpen`), for what the site draws around Build:
 * `{ open }`. Closed signed out (without asking the API), when the API says no, and on any failure, an API that does
 * not know Build yet included. Kept a minute by this browser alone.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = buildViewerOf(req);
  const open = viewer ? await buildOpenFor(viewer) : false;
  return NextResponse.json({ open }, { headers: { 'Cache-Control': 'private, max-age=60' } });
});
