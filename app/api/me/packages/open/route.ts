import { type NextRequest, NextResponse } from 'next/server';

import { sessionTokenOf } from '@/lib/contribute/session-token';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';

/** Whether package pages are open to the signed-in viewer, for the parts of a page drawn in the browser: `{ open }`. */
export async function GET(req: NextRequest) {
  const token = await sessionTokenOf(req);
  const open = token?.githubLogin && !token.error ? await requestMaySeePackages(req) : false;
  return NextResponse.json({ open }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
