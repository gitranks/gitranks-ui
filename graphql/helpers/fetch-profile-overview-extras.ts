import { fetchRankedCounts } from './fetch-ranked-counts';

type RankedCounts = Exclude<Awaited<ReturnType<typeof fetchRankedCounts>>, undefined>;

export type ProfileOverviewExtras = {
  rankedGlobal: RankedCounts;
  rankedCountry: RankedCounts;
  /** False when a read failed and the page renders without its part, so it is cached briefly. */
  complete: boolean;
};

type ProfileForExtras = { country?: string | null } | null | undefined;

/**
 * What the overview adds to the profile's own data: the ranked counts the summary cites, worldwide and in
 * the profile's country. Each is optional; the page renders without them.
 */
export const fetchProfileOverviewExtras = async (user: ProfileForExtras): Promise<ProfileOverviewExtras> => {
  let complete = true;
  // A failed read comes back as `undefined` rather than as an error.
  const optional = async (name: string): Promise<RankedCounts> => {
    const counts = await fetchRankedCounts(name);
    if (counts === undefined) {
      complete = false;
    }
    return counts ?? null;
  };

  const [rankedGlobal, rankedCountry] = await Promise.all([
    user ? optional('global') : null,
    user?.country ? optional(user.country) : null,
  ]);

  return { rankedGlobal, rankedCountry, complete };
};
