import { fetchRankedCounts } from './fetch-ranked-counts';
import { fetchStarsNeighbours, type StarsNeighbour } from './fetch-stars-neighbours';

type RankedCounts = Awaited<ReturnType<typeof fetchRankedCounts>>;

export type ProfileOverviewExtras = {
  rankedGlobal: RankedCounts;
  rankedCountry: RankedCounts;
  starsNeighbours: StarsNeighbour[];
  /** False when a read failed and the page renders without its part, so it is cached briefly. */
  complete: boolean;
};

type ProfileForExtras = { country?: string | null; rankGlobal?: { s?: number | null } | null } | null | undefined;

/**
 * What the overview adds to the profile's own data: the ranked counts the summary cites and, when
 * asked, the neighbours in the worldwide Stars Rank. Each is optional; the page renders without any.
 */
export const fetchProfileOverviewExtras = async (
  user: ProfileForExtras,
  { neighbours }: { neighbours: boolean },
): Promise<ProfileOverviewExtras> => {
  let complete = true;
  const optional = <T>(read: Promise<T>, fallback: T) =>
    read.catch(() => {
      complete = false;
      return fallback;
    });

  // Only a ranked position has neighbours to list: a provisional rank is not in the ranking yet.
  const starsRank = neighbours ? user?.rankGlobal?.s : undefined;

  const [rankedGlobal, rankedCountry, starsNeighbours] = await Promise.all([
    user ? optional(fetchRankedCounts('global'), null) : null,
    user?.country ? optional(fetchRankedCounts(user.country), null) : null,
    starsRank ? optional(fetchStarsNeighbours(starsRank), []) : [],
  ]);

  return { rankedGlobal, rankedCountry, starsNeighbours, complete };
};
