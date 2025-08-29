const TOTAL_AMOUNT_OF_GITHUB_USERS = 10_000_000;

type Bin = {
  upper: number;
  round: (n: number) => number | null;
};

const bins: Bin[] = [
  { upper: 0.001, round: () => 0.001 },
  { upper: 0.01, round: () => 0.01 },
  { upper: 0.1, round: () => 0.1 },
  { upper: 0.5, round: () => 0.5 },
  { upper: 10, round: (n) => Math.ceil(n) },
  { upper: 50, round: (n) => Math.ceil(n / 10) * 10 },
];

export function normalizeValue(value: number): number | null {
  if (value > 50) {
    return null;
  }

  for (const { upper, round } of bins) {
    if (value <= upper) {
      return round(value);
    }
  }

  // Fallback for values <= 0 or any unexpected case
  return 0.001;
}

export const getPercentileRank = (rank?: number | null, amountOfUsers?: number): number | null => {
  if (!rank) {
    return null;
  }

  const percentileRank = (rank / (amountOfUsers ?? TOTAL_AMOUNT_OF_GITHUB_USERS)) * 100;

  return normalizeValue(percentileRank);
};
