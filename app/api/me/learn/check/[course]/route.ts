import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnCheckSide } from '@/lib/learn/check.data';
import { loadLearnMainLanguage } from '@/lib/learn/setup.data';

/**
 * The signed-in person's run of a course's check, read in the browser once the page is up: `{ check, missing,
 * mainLanguage }`, the questions still to answer or the result once the run ended. Null signed out (without asking the
 * API), when Learn is not open to them, and on any failure; `missing` when the course offers no check. `mainLanguage`
 * is their setup's main language, the one each question's code opens in, read apart so it fails alone. Never kept:
 * every answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { course } = (await params) as { course: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const [side, mainLanguage] = viewer
    ? await Promise.all([loadLearnCheckSide(viewer, course), loadLearnMainLanguage(viewer)])
    : [{ check: null, missing: false }, null];
  return NextResponse.json({ ...side, mainLanguage }, { headers: { 'Cache-Control': 'private, no-store' } });
});
