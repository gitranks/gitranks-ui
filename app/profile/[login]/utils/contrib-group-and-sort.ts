import { Contribution } from '@/types/generated/graphql';

export const groupAndSortContributions = (contributions: Contribution[]) => {
  const grouped = contributions.reduce<Record<number, Omit<Contribution, 'year'>[]>>((acc, { year, ...data }) => {
    if (!acc[year]) {
      acc[year] = [];
    }

    acc[year].push(data);
    return acc;
  }, {});

  const sorted = Object.entries(grouped)
    .map(([year, data]) => ({
      year: Number(year),
      data: data.sort((a, b) => {
        // Primary: mergedPrsCount DESC, Secondary: stargazersCount DESC
        if (b.mergedPrsCount !== a.mergedPrsCount) {
          return (b.mergedPrsCount ?? 0) - (a.mergedPrsCount ?? 0);
        }

        return (b.repository?.stargazerCount ?? 0) - (a.repository?.stargazerCount ?? 0);
      }),
    }))
    .sort((a, b) => b.year - a.year);

  return sorted;
};
