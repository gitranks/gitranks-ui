'use client';

import { useSession } from 'next-auth/react';
import type { FC } from 'react';

import { ExampleCards, type ExampleRank } from './example-cards';
import { UnsungHeroCard } from './unsung-hero-card';
import { YourRankCard } from './your-rank-card';
import type { UnsungHero } from '@/lib/unsung-hero/unsung-hero';

/**
 * The hero's right column: this week's Unsung hero when there is one, read with the page and in its HTML, signed in or
 * out; otherwise your own card when signed in, examples when not.
 */
export const HeroAside: FC<{ examples: ExampleRank[]; hero?: UnsungHero | null }> = ({ examples, hero = null }) => {
  const { data: session, status } = useSession();
  const login = session?.user?.githubLogin;

  if (hero) {
    return <UnsungHeroCard hero={hero} />;
  }

  if (status === 'authenticated' && login) {
    // Keyed by the login: another account's sign-in starts a fresh card instead of showing the last one's.
    return <YourRankCard key={login} login={login} />;
  }

  return <ExampleCards examples={examples} />;
};
