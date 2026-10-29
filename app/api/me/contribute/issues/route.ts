import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { IssuesForProfileDocument } from '@/lib/contribute/contribute.documents';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { isProfileOwner, PROFILE_ISSUES_MAX, type ProfileIssuesAnswer } from '@/lib/contribute/profile-issues';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * The profile block "Issues for you": the best few issues picked for the signed-in viewer, on their own profile only
 * (`?login=`). Empty for anyone else, without asking the API, and on any failure: the profile never shows the block
 * then.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const login = req.nextUrl.searchParams.get('login');
  let issues: ContributeIssue[] = [];

  if (viewer && isProfileOwner(viewer, login)) {
    try {
      const { issuesForProfile } = await graphqlDirect(
        IssuesForProfileDocument,
        { login: viewer },
        { source: 'client', githubLogin: viewer },
      );
      issues = (issuesForProfile ?? []).slice(0, PROFILE_ISSUES_MAX);
    } catch {
      issues = [];
    }
  }

  return NextResponse.json({ issues } satisfies ProfileIssuesAnswer, { headers: NO_STORE });
});
