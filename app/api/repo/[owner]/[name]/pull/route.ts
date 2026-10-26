import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';
import type { RepoPullResult, RepoPullState, RepoPullStatus } from '@/types/repo-pull.types';
import { ExpiredRefreshStates } from '@/utils/profile-refresh';
import { getRepoCacheTag, parseRepoParams } from '@/utils/repo-paths';
import { recentPullState, repoPullPath } from '@/utils/repo-pull';

const expiredStates = new ExpiredRefreshStates();

const NO_STORE = { 'Cache-Control': 'no-store' };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

const repoOf = async (params: Promise<unknown> | undefined) => {
  const { owner, name } = ((await params) ?? {}) as { owner?: string; name?: string };
  return typeof owner === 'string' && typeof name === 'string' ? parseRepoParams(owner, name) : null;
};

const invalidRepo = () => json({ message: 'Invalid repository' }, 400);

type Upstream<T> = { ok: true; body: T } | { ok: false; status: number };

/** The upstream answer; one that throws or whose body is not a JSON object reads as a 502. */
async function readUpstream<T>(call: () => Promise<Response>): Promise<Upstream<T>> {
  try {
    const response = await call();
    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const body: unknown = await response.json();
    return body && typeof body === 'object' ? { ok: true, body: body as T } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 502 };
  }
}

/** Only the fields the button needs, so nothing else the upstream adds is published. */
const publicPullOf = (pull: RepoPullState | null | undefined) =>
  pull ? { id: pull.id, status: pull.status, requestedAt: pull.requestedAt, finishedAt: pull.finishedAt } : null;

/** The repository's latest fetch, and what the signed-in visitor may still fetch. */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const repo = await repoOf(params);
  if (!repo) {
    return invalidRepo();
  }

  const query = new URLSearchParams({ owner: repo.owner, name: repo.name });
  const read = await readUpstream<RepoPullStatus>(() =>
    signedFetch(`/repo/pull/status?${query}`, {}, 'client', req.auth?.user.githubLogin),
  );

  if (!read.ok) {
    return json({ message: 'Failed to load the star history fetch' }, read.status);
  }

  const pull = publicPullOf(read.body.pull);
  const now = Date.now();
  const state = recentPullState(pull, now);
  const tag = getRepoCacheTag(repo.owner, repo.name);

  // A fetch finished lately: expire the cached page, so the reload after it shows the new history.
  if (state && expiredStates.claim(tag, state, now, tag)) {
    revalidateTag(tag, { expire: 0 });
  }

  return json({ pull, allowance: read.body.allowance ?? null });
});

/** Starts a fetch of the repository's star history for the signed-in visitor. */
export const POST = auth(async function POST(req: AuthRequest, { params }) {
  const githubLogin = req.auth?.user.githubLogin;
  if (!githubLogin) {
    return json({ message: 'Not authenticated' }, 401);
  }

  const repo = await repoOf(params);
  if (!repo) {
    return invalidRepo();
  }

  const read = await readUpstream<RepoPullResult>(() =>
    signedFetch(
      repoPullPath(req.auth?.user.authMode),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      },
      'client',
      githubLogin,
    ),
  );

  if (!read.ok) {
    return json({ message: 'The star history fetch failed' }, read.status);
  }

  const result = read.body;

  // The fetch is now under way, so a reload shows its progress instead of the cached page.
  if (result.status === 'started') {
    revalidateTag(getRepoCacheTag(repo.owner, repo.name), { expire: 0 });
  }

  return json(result);
});
