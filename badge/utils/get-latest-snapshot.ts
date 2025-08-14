import { User } from '@/types/generated/graphql';

export const getLatestSnapshot = (snapshots: User['snapshots']): User['snapshots'][string] | null => {
  const dates = Object.keys(snapshots);
  if (!dates.length) {
    return null;
  }

  // Sort date strings ascending
  const sortedDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const latestDate = sortedDates[sortedDates.length - 1];

  return snapshots[latestDate];
};
