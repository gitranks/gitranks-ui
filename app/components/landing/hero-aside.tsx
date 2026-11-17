'use client';

import { useSession } from 'next-auth/react';
import type { FC } from 'react';

import { ExampleCards, type ExampleRank } from './example-cards';
import { YourRankCard } from './your-rank-card';

/** The hero's right column: your own card when signed in, examples otherwise. */
export const HeroAside: FC<{ examples: ExampleRank[] }> = ({ examples }) => {
  const { data: session, status } = useSession();
  const login = session?.user?.githubLogin;

  if (status === 'authenticated' && login) {
    // Keyed by the login: another account's sign-in starts a fresh card instead of showing the last one's.
    return <YourRankCard key={login} login={login} />;
  }

  return <ExampleCards examples={examples} />;
};
