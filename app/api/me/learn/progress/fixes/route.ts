import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnMyFixes } from '@/lib/learn/my-progress.data';

/**
 * The signed-in person's fixes made with Learn, read in the browser when My progress opens "Your fixes":
 * `{ fixes, end, signedOut }`. With none, `end` has the open issues that fit them and their list's email. Fixes are
 * null when Learn is not open to them and on any failure; null with `signedOut` when there is no session or it needs a
 * new sign-in (without asking the API). Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer) return NextResponse.json({ fixes: null, end: null, signedOut: true }, { headers });
  const { fixes, end } = await loadLearnMyFixes(viewer);
  return NextResponse.json({ fixes, end, signedOut: false }, { headers });
});
