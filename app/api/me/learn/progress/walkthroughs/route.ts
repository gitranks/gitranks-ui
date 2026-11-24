import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnMyWalkthroughs } from '@/lib/learn/my-progress.data';

/**
 * The walkthroughs of other people's fixes the signed-in person passed, read in the browser when My progress opens
 * "Walkthroughs": `{ walkthroughs, fixes, signedOut }`. With none, `fixes` is how many merged fixes have one.
 * Walkthroughs are null when Learn is not open to them and on any failure; null with `signedOut` when there is no
 * session or it needs a new sign-in (without asking the API). Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer) return NextResponse.json({ walkthroughs: null, fixes: null, signedOut: true }, { headers });
  const { walkthroughs, fixes } = await loadLearnMyWalkthroughs(viewer);
  return NextResponse.json({ walkthroughs, fixes, signedOut: false }, { headers });
});
