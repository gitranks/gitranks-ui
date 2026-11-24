import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { PROFILE_ISSUES_MAX } from '@/lib/contribute/profile-issues';
import { type OwnProfileBlockAnswer, profilePickOf } from '@/lib/contribute/profile-picks';
import { OwnProfilePicksMaskedDocument } from '@/lib/contribute/profile-picks.data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { isProfileOwner } from '@/utils/profile-owner';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * What the signed-in owner's own profile shows them (`?login=`): the top of their own list once they are a
 * contributor, else their picks. `none` for anyone else, without asking the API, and on any failure.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const login = req.nextUrl.searchParams.get('login');
  let answer: OwnProfileBlockAnswer = { kind: 'none' };

  if (viewer && isProfileOwner(viewer, login)) {
    try {
      const options = { source: 'client' as const, githubLogin: viewer };
      const { ownProfilePicks } = await graphqlDirect(OwnProfilePicksMaskedDocument, { login: viewer }, options);
      // A masked pick leaves the route stripped of what names its issue.
      const issues = (ownProfilePicks?.items ?? []).slice(0, PROFILE_ISSUES_MAX).map(profilePickOf);
      if (issues.length) {
        answer = ownProfilePicks?.contributor
          ? { kind: 'contributor', issues }
          : { kind: 'own', issues, stats: ownProfilePicks?.stats ?? null };
      }
    } catch {
      answer = { kind: 'none' };
    }
  }

  return NextResponse.json(answer, { headers: NO_STORE });
});
