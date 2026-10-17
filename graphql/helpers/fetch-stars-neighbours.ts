import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileStarsNeighboursDocument } from '@/types/generated/graphql';

export const NEIGHBOURS_EACH_SIDE = 5;

// The rankings query takes offsets up to this.
const MAX_OFFSET = 100_000;

export type StarsNeighbour = { rank: number; login: string; stars?: number | null };

/** The profiles ranked just above and below a worldwide Stars Rank, the profile itself included. */
export const fetchStarsNeighbours = async (rank: number): Promise<StarsNeighbour[]> => {
  'use cache';
  cacheLife('hours');

  const offset = Math.max(0, rank - NEIGHBOURS_EACH_SIDE - 1);

  if (offset > MAX_OFFSET) {
    return [];
  }

  const { globalRankings } =
    (await graphqlDirect(ProfileStarsNeighboursDocument, { offset, limit: NEIGHBOURS_EACH_SIDE * 2 + 1 })) ?? {};

  return (globalRankings ?? []).flatMap(({ s, user }) =>
    s && user?.login ? [{ rank: s, login: user.login, stars: user.s }] : [],
  );
};
