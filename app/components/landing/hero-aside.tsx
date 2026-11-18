'use client';

import { useSession } from 'next-auth/react';
import type { FC } from 'react';

import { ExampleCards, type ExampleRank } from './example-cards';
import { UnsungHeroCard } from './unsung-hero-card';
import { YourRankCard } from './your-rank-card';
import { usePackagesOpen } from '@/lib/packages/packages-open';
import { useUnsungHero } from '@/lib/unsung-hero/use-unsung-hero';

/**
 * The hero's right column: this week's Unsung hero when there is one, for everyone it is open to, signed in or out;
 * otherwise your own card when signed in, examples when not. The hero is asked in the browser, and only once the
 * feature is open to the viewer: the page is cached for everyone, so its HTML always holds the cards without it.
 */
export const HeroAside: FC<{ examples: ExampleRank[] }> = ({ examples }) => {
  const { data: session, status } = useSession();
  const hero = useUnsungHero(usePackagesOpen());
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
