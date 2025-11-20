import type { User } from '@/types/generated/graphql';

export const getLatestSnapshot = (snapshots: User['snapshots']): User['snapshots'][string] | null => {
  if (!snapshots || typeof snapshots !== 'object') {
    return null;
  }

  const dates = Object.keys(snapshots);
  if (!dates.length) {
    return null;
  }

  // Sort date strings ascending
  const sortedDates = dates.toSorted((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const latestDate = sortedDates.at(-1);
  return latestDate ? snapshots[latestDate] : null;
};
