import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { IssuesForProfileDocument } from '@/lib/contribute/contribute.documents';
import { isProfileOwner, PROFILE_ISSUES_MAX } from '@/lib/contribute/profile-issues';
import type { OwnProfileBlockAnswer } from '@/lib/contribute/profile-picks';
import { OwnProfilePicksDocument } from '@/lib/contribute/profile-picks.data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * What the signed-in owner's own profile shows them (`?login=`): a contributor's "Issues for you", or, before they
 * connect, their own picks. `none` for anyone else, without asking the API, and on any failure.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const login = req.nextUrl.searchParams.get('login');
  let answer: OwnProfileBlockAnswer = { kind: 'none' };

  if (viewer && isProfileOwner(viewer, login)) {
    const as = { source: 'client' as const, githubLogin: viewer };
    try {
      const { ownProfilePicks } = await graphqlDirect(OwnProfilePicksDocument, { login: viewer }, as);
      if (ownProfilePicks?.contributor) {
        const { issuesForProfile } = await graphqlDirect(IssuesForProfileDocument, { login: viewer }, as);
        const issues = (issuesForProfile ?? []).slice(0, PROFILE_ISSUES_MAX);
        answer = issues.length ? { kind: 'contributor', issues } : { kind: 'none' };
      } else if (ownProfilePicks?.items.length) {
        answer = {
          kind: 'own',
          issues: ownProfilePicks.items.slice(0, PROFILE_ISSUES_MAX),
          stats: ownProfilePicks.stats,
        };
      }
    } catch {
      answer = { kind: 'none' };
    }
  }

  return NextResponse.json(answer, { headers: NO_STORE });
});
