import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { isProfileOwner } from '@/lib/contribute/profile-issues';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { LearnPromoDocument } from '@/lib/learn/learn.documents';
import { type LearnPromoAnswer, promoPlacementOf, shownPromoOf } from '@/lib/learn/learn-promo';

/** Never kept: "Not for me" must hide the suggestion on the next page. */
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * Whether to suggest GitRanks Learn to the signed-in viewer (`?placement=landing|profile&login=<their own login>`): on
 * the home page, or on their own profile. `{ promo: null }` for anyone else, without asking the API, and on any failure
 * (an API that does not know the fields yet included), so the page shows what it showed before.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const placement = promoPlacementOf(req.nextUrl.searchParams.get('placement'));
  const login = req.nextUrl.searchParams.get('login');
  let answer: LearnPromoAnswer = { promo: null };

  if (viewer && placement && isProfileOwner(viewer, login)) {
    try {
      const data = await graphqlDirect(
        LearnPromoDocument,
        { placement, login: placement === 'PROFILE' ? viewer : null },
        { source: 'client', githubLogin: viewer },
      );
      answer = { promo: shownPromoOf(data) };
    } catch {
      answer = { promo: null };
    }
  }

  return NextResponse.json(answer, { headers: NO_STORE });
});
