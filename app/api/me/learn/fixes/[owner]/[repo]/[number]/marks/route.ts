import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadFixMarks, NO_FIX_MARKS } from '@/lib/learn/fix-page.data';
import { fixRefOf } from '@/lib/learn/walkthrough';

/**
 * The signed-in person's marks on a fix's page, read in the browser once "Learn from it" is up: `{ marks, reads }`
 * (whether they made the fix, its walkthrough held, how far they are in it, their mark on its lesson, up to three
 * similar issues of their list, masked, with what those rows need). Both null signed out (without asking the API), for
 * an address that names no pull request, when Learn is not open to them, when the API does not answer it yet, and on
 * any failure. Never kept: a pass, a lesson and the list change it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { owner, repo, number } = (await params) as { owner: string; repo: string; number: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const pr = fixRefOf(owner, repo, number);
  const answer = viewer && pr ? await loadFixMarks(pr, viewer).catch(() => NO_FIX_MARKS) : NO_FIX_MARKS;
  return NextResponse.json(answer, { headers: { 'Cache-Control': 'private, no-store' } });
});
