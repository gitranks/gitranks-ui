const TOTAL_AMOUNT_OF_GITHUB_USERS = 10_000_000;

type Bin = {
  upper: number;
  round: (n: number) => number | null;
};

const bins: Bin[] = [
  { upper: 0.0001, round: (n) => Math.ceil(n * 10000) / 10000 },
  { upper: 0.1, round: (n) => Math.ceil(n * 1000) / 1000 },
  { upper: 1, round: (n) => Math.ceil(n * 100) / 100 },
  { upper: 10, round: (n) => Math.ceil(n * 10) / 10 },
  { upper: 50, round: (n) => Math.ceil(n) },
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
  return 0.0001;
}

export const getPercentileRank = (rank?: number | null, amountOfUsers?: number): number | null => {
  if (!rank) {
    return null;
  }

  const percentileRank = (rank / (amountOfUsers ?? TOTAL_AMOUNT_OF_GITHUB_USERS)) * 100;

  return normalizeValue(percentileRank);
};
