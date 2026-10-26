import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';
import type { RepoPullResult, RepoPullStatus } from '@/types/repo-pull.types';
import { ExpiredRefreshStates } from '@/utils/profile-refresh';
import { getRepoCacheTag, parseRepoParams } from '@/utils/repo-paths';
import { recentPullState, repoPullPath } from '@/utils/repo-pull';

const expiredStates = new ExpiredRefreshStates();

const repoOf = async (params: Promise<unknown> | undefined) => {
  const { owner, name } = ((await params) ?? {}) as { owner?: string; name?: string };
  return typeof owner === 'string' && typeof name === 'string' ? parseRepoParams(owner, name) : null;
};

const invalidRepo = () => NextResponse.json({ message: 'Invalid repository' }, { status: 400 });

/** The repository's latest fetch, and what the signed-in visitor may still fetch. */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const repo = await repoOf(params);
  if (!repo) {
    return invalidRepo();
  }

  const query = new URLSearchParams({ owner: repo.owner, name: repo.name });
  const response = await signedFetch(`/repo/pull/status?${query}`, {}, 'client', req.auth?.user.githubLogin);

  if (!response.ok) {
    return NextResponse.json({ message: 'Failed to load the star history fetch' }, { status: response.status });
  }

  const result = (await response.json()) as RepoPullStatus;
  const now = Date.now();
  const state = recentPullState(result.pull, now);
  const tag = getRepoCacheTag(repo.owner, repo.name);

  // A fetch finished lately: expire the cached page once, so the reload after it shows the new history.
  if (state && expiredStates.claim(tag, state, now, tag)) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json(result);
});

/** Starts a fetch of the repository's star history for the signed-in visitor. */
export const POST = auth(async function POST(req: AuthRequest, { params }) {
  const githubLogin = req.auth?.user.githubLogin;
  if (!githubLogin) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const repo = await repoOf(params);
  if (!repo) {
    return invalidRepo();
  }

  const response = await signedFetch(
    repoPullPath(req.auth?.user.authMode),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: repo.owner, name: repo.name }),
    },
    'client',
    githubLogin,
  );

  if (!response.ok) {
    return NextResponse.json({ message: 'The star history fetch failed' }, { status: response.status });
  }

  const result = (await response.json()) as RepoPullResult;

  // The fetch is now under way, so a reload shows its progress instead of the cached page.
  if (result.status === 'started') {
    revalidateTag(getRepoCacheTag(repo.owner, repo.name), { expire: 0 });
  }

  return NextResponse.json(result);
});
