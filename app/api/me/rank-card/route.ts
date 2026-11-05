import { cacheLife } from 'next/cache';
import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { fetchGlobalTiers } from '@/app/components/landing/landing-data';
import { tierAt } from '@/app/components/landing/landing-ui';
import type { RankCardData, RankCardEntry } from '@/app/components/landing/rank-card.types';
import { auth } from '@/auth';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { GlobalRankByLoginDocument } from '@/types/generated/graphql';

// The browser may reuse the answer for 5 minutes; it is the viewer's own data, so never a shared cache. The browser
// keys its copy by URL, so the URL carries the login (`?login=`): an account switch asks anew instead of reusing the
// previous account's card. For a signed-in request the proxy sets the header the browser sees (`signedInCacheControl`).
const CACHE_CONTROL = 'private, max-age=300';
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** One user's three global ranks with their tiers. Cached per login for 5 minutes. */
const readRankCard = async (login: string): Promise<RankCardData | null> => {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300, expire: 3_600 });

  const [{ globalRankByLogin: rank }, tiers] = await Promise.all([
    graphqlDirect(GlobalRankByLoginDocument, { login }),
    fetchGlobalTiers(),
  ]);

  if (!rank?.user) {
    return null;
  }

  const entry = (
    position: number | null | undefined,
    previous: number | null | undefined,
    value: number | null | undefined,
    rankedCount: number | null | undefined,
    cutOffs: Parameters<typeof tierAt>[0],
  ): RankCardEntry => {
    const tier = tierAt(cutOffs, position);
    return {
      position: position ?? null,
      previous: previous ?? null,
      value: value ?? null,
      rankedCount: rankedCount ?? null,
      tier: tier ? { tier: tier.tier, level: tier.level } : null,
    };
  };

  return {
    login: rank.user.login,
    avatarUrl: rank.user.avatarUrl ?? null,
    rankings: {
      s: entry(rank.s, rank.sM, rank.user.s, tiers?.sUsers, tiers?.sTiers),
      c: entry(rank.c, rank.cM, rank.user.c, tiers?.cUsers, tiers?.cTiers),
      f: entry(rank.f, rank.fM, rank.user.f, tiers?.fUsers, tiers?.fTiers),
    },
  };
};

/**
 * The signed-in visitor's rank card for the landing page, at `?login=<their own login>`. The login only keys the
 * browser's copy: the card is always the session's, and any other login is refused.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const login = req.auth?.user.githubLogin;
  if (!login) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401, headers: NO_STORE });
  }

  if (req.nextUrl.searchParams.get('login')?.toLowerCase() !== login.toLowerCase()) {
    return NextResponse.json({ message: 'Not your login' }, { status: 400, headers: NO_STORE });
  }

  try {
    const card = await readRankCard(login);
    if (!card) {
      return NextResponse.json(
        { message: 'Not ranked yet' },
        { status: 404, headers: { 'Cache-Control': CACHE_CONTROL } },
      );
    }

    return NextResponse.json(card, { headers: { 'Cache-Control': CACHE_CONTROL } });
  } catch {
    return NextResponse.json({ message: 'Failed to load the rank card' }, { status: 502, headers: NO_STORE });
  }
});
