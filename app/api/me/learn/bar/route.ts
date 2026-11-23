import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnBar } from '@/lib/learn/learn-bar.data';

/**
 * Learn's bar for the signed-in person, read in the browser after the page is up: `{ bar }`, null signed out (without
 * asking the API), when Learn is not open to them, and on any failure. Never kept: a review changes the count.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const bar = viewer ? await loadLearnBar(viewer) : null;
  return NextResponse.json({ bar }, { headers: { 'Cache-Control': 'private, no-store' } });
});
