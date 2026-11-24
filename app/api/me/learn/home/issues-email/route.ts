import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadHomeIssuesEmail } from '@/lib/learn/real-issues.data';

/**
 * Learn home's list email for the signed-in person: `{ email: { emailOn, emailTo } }`, read again in the browser while
 * the quiet box says the email is on with no address. Null signed out (without asking the API), when the API does not
 * answer it, and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const email = viewer ? await loadHomeIssuesEmail(viewer).catch(() => null) : null;
  return NextResponse.json({ email }, { headers: { 'Cache-Control': 'private, no-store' } });
});
