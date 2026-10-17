import { fetchRankedCounts } from './fetch-ranked-counts';
import { fetchStarsNeighbours, type StarsNeighbour } from './fetch-stars-neighbours';

type RankedCounts = Awaited<ReturnType<typeof fetchRankedCounts>>;

export type ProfileOverviewExtras = {
  rankedGlobal: RankedCounts;
  rankedCountry: RankedCounts;
  starsNeighbours: StarsNeighbour[];
};

type ProfileForExtras = { country?: string | null; rankGlobal?: { s?: number | null } | null } | null | undefined;

/**
 * What the overview adds to the profile's own data: the ranked counts the summary cites and the
 * neighbours in the worldwide Stars Rank. Each is optional; the page renders without any of them.
 */
export const fetchProfileOverviewExtras = async (user: ProfileForExtras): Promise<ProfileOverviewExtras> => {
  // Only a ranked position has neighbours to list: a provisional rank is not in the ranking yet.
  const starsRank = user?.rankGlobal?.s;

  const [rankedGlobal, rankedCountry, starsNeighbours] = await Promise.all([
    user ? fetchRankedCounts('global').catch(() => null) : null,
    user?.country ? fetchRankedCounts(user.country).catch(() => null) : null,
    starsRank ? fetchStarsNeighbours(starsRank).catch(() => []) : [],
  ]);

  return { rankedGlobal, rankedCountry, starsNeighbours };
};
