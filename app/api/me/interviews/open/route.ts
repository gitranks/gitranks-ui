import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsOpenWithin } from '@/lib/interviews/interviews-gate';
import { INTERVIEWS_NO_STORE, interviewsViewerOf } from '@/lib/interviews/interviews-route';

/**
 * Whether GitRanks Interviews is open to the signed-in person (the API's `interviewsOpen`), for what the site draws
 * around Interviews: `{ open }`. Closed signed out (without asking the API), when the API says no, and on any failure,
 * an API that does not know Interviews yet included, and a slow one (the proxy's time limit). Never kept: the browser
 * may change account.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = interviewsViewerOf(req);
  const open = viewer ? await interviewsOpenWithin(viewer) : false;
  return NextResponse.json({ open }, { headers: INTERVIEWS_NO_STORE });
});
