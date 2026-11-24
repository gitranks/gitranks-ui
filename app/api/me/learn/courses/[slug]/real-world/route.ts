import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadCourseOpenIssues } from '@/lib/learn/real-issues.data';

/**
 * A course's third box for the signed-in person, read in the browser after the course's page is up: `{ openIssues }`,
 * the open issues of their list for lessons of the course. Null signed out (without asking the API), for none, when
 * Learn is not open to them, when the API does not answer it yet, and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const openIssues = viewer ? await loadCourseOpenIssues(slug, viewer).catch(() => null) : null;
  return NextResponse.json({ openIssues }, { headers: { 'Cache-Control': 'private, no-store' } });
});
