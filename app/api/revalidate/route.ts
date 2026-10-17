import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileFetchingStatusDocument } from '@/types/generated/graphql';
import { ExpiredRefreshStates, isGithubLogin, profileCacheTag, recentRefreshState } from '@/utils/profile-refresh';

const expiredStates = new ExpiredRefreshStates();

/**
 * Expires a profile's cached pages after a refresh of that profile started or finished. The fetch status
 * is read here rather than taken from the caller, and the cache is expired once per status, so a call
 * with no refresh behind it changes nothing.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const login: unknown = body?.login;

  if (!isGithubLogin(login)) {
    return NextResponse.json({ revalidated: false }, { status: 400 });
  }

  let state: string | null;

  try {
    const { user } = await graphqlDirect(ProfileFetchingStatusDocument, { login }, { source: 'client' });
    state = recentRefreshState(user, Date.now());
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 });
  }

  if (!state) {
    return NextResponse.json({ revalidated: false }, { status: 403 });
  }

  if (!expiredStates.claim(login, state)) {
    return NextResponse.json({ revalidated: false });
  }

  // `expire: 0` instead of the 'max' profile: the caller reloads the page right after, so serving
  // stale-while-revalidate would show the pre-fetch profile again.
  revalidateTag(profileCacheTag(login), { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
