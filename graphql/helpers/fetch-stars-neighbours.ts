import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileStarsNeighboursDocument } from '@/types/generated/graphql';

/** How many rows either side of the rank are read. Wider than what is shown, so a gap in the ranks
 * or a rank that moved since the window was cached still leaves the profile inside it. */
export const NEIGHBOURS_WINDOW = 10;

// The rankings query takes offsets up to this.
export const MAX_NEIGHBOURS_OFFSET = 100_000;

export type StarsNeighbour = { rank: number; login: string; stars?: number | null };

/** The rows of the worldwide Stars Rank around a rank, that rank included. */
export const fetchStarsNeighbours = async (rank: number): Promise<StarsNeighbour[]> => {
  'use cache';
  cacheLife('hours');

  const offset = Math.max(0, rank - NEIGHBOURS_WINDOW - 1);

  if (offset > MAX_NEIGHBOURS_OFFSET) {
    return [];
  }

  const { globalRankings } =
    (await graphqlDirect(ProfileStarsNeighboursDocument, { offset, limit: NEIGHBOURS_WINDOW * 2 + 1 })) ?? {};

  return (globalRankings ?? []).flatMap(({ s, user }) =>
    s && user?.login ? [{ rank: s, login: user.login, stars: user.s }] : [],
  );
};
