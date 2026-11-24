import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { fixRefOf } from '@/lib/learn/walkthrough';
import { loadFixMine } from '@/lib/learn/walkthrough.data';

const NONE = { mine: null, answers: null };

/**
 * The signed-in person's side of a fix, read in the browser after a walkthrough's or an answers page is up: `{ mine,
 * answers }` (whether they made the fix, its walkthrough held, their pass, the first similar issue of their list; with
 * `?answers=1` the fixer's own answers, shared or not). Each null signed out (without asking the API), for an address
 * that names no pull request, when Learn is not open to them, when the API does not answer it yet, and on any failure.
 * Never kept: a pass and the sharing switch change it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { owner, repo, number } = (await params) as { owner: string; repo: string; number: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const pr = fixRefOf(owner, repo, number);
  const answers = req.nextUrl.searchParams.get('answers') === '1';
  const answer = viewer && pr ? await loadFixMine(pr, viewer, { answers }).catch(() => NONE) : NONE;
  return NextResponse.json(answer, { headers: { 'Cache-Control': 'private, no-store' } });
});
