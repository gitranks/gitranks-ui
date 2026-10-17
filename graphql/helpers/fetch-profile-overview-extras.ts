import { fetchRankedCounts } from './fetch-ranked-counts';

type RankedCounts = Awaited<ReturnType<typeof fetchRankedCounts>>;

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
  const optional = <T>(read: Promise<T>, fallback: T) =>
    read.catch(() => {
      complete = false;
      return fallback;
    });

  const [rankedGlobal, rankedCountry] = await Promise.all([
    user ? optional(fetchRankedCounts('global'), null) : null,
    user?.country ? optional(fetchRankedCounts(user.country), null) : null,
  ]);

  return { rankedGlobal, rankedCountry, complete };
};
