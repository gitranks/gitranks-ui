/**
 * Pure helpers for the monthly country and language rankings: last month's snapshot, positions by name, shares, and
 * the languages that stand out in a country.
 */

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

/** The snapshot a month before `2026-11-01`: `2026-10-01`. Null for anything that isn't a snapshot date. */
export function previousSnapshotDate(date?: string | null): string | null {
  const match = date?.match(/^(\d{4})-(\d{2})-01$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return month === 1 ? `${year - 1}-12-01` : `${year}-${String(month - 1).padStart(2, '0')}-01`;
}

/** A snapshot date's month name: `2026-10-01` → `October`. */
export function snapshotMonth(date: string): string {
  return MONTH.format(new Date(`${date}T00:00:00Z`));
}

/** Each name's position (1-based) in rows that already come in ranking order. */
export function positionsByName<T>(rows: readonly T[], name: (row: T) => string): Map<string, number> {
  return new Map(rows.map((row, i) => [name(row), i + 1]));
}

/** The sum of one value over every row. */
export function totalOf<T>(rows: readonly T[], value: (row: T) => number): number {
  return rows.reduce((sum, row) => sum + (value(row) || 0), 0);
}

/** A share between 0 and 1; 0 when there is nothing to share. */
export function shareOf(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

/** `0.2555` → `25.6%`, `0.0004` → `<0.1%`. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.001) {
    return '<0.1%';
  }
  return `${(share * 100).toFixed(1)}%`;
}

/** The row that climbed most since last month, if any climbed. Ties go to the higher position. */
export function biggestClimb<T extends { rank: number; previous: number | null }>(rows: readonly T[]): T | null {
  let best: T | null = null;
  for (const row of rows) {
    const climb = row.previous ? row.previous - row.rank : 0;
    const bestClimb = best?.previous ? best.previous - best.rank : 0;
    if (climb > 0 && climb > bestClimb) {
      best = row;
    }
  }
  return best;
}

export type StandOutRow = { language: string; rank: number; previous: number | null; worldRank: number | null };

export type StandOut<T extends StandOutRow> =
  | { kind: 'above-world'; row: T & { worldRank: number } }
  | { kind: 'climb'; row: T & { previous: number } };

type StandOutOptions = {
  /** Only languages this high in the country count. */
  within?: number;
  /** How many places higher than worldwide a language must rank. */
  minGap?: number;
  /** The smallest climb since last month worth naming. */
  minClimb?: number;
  max?: number;
};

/**
 * What stands out in a country: its highest languages that rank well above their worldwide position, then the
 * biggest climb since last month. Rows come in ranking order.
 */
export function findStandOuts<T extends StandOutRow>(
  rows: readonly T[],
  { within = 25, minGap = 8, minClimb = 3, max = 3 }: StandOutOptions = {},
): StandOut<T>[] {
  const top = rows.filter((row) => row.rank <= within);
  const out: StandOut<T>[] = [];

  for (const row of top) {
    if (out.length >= max - 1) {
      break;
    }
    if (row.worldRank !== null && row.worldRank - row.rank >= minGap) {
      out.push({ kind: 'above-world', row: row as T & { worldRank: number } });
    }
  }

  const named = new Set(out.map(({ row }) => row.language));
  const climb = biggestClimb(top.filter((row) => !named.has(row.language)));
  if (climb?.previous && climb.previous - climb.rank >= minClimb) {
    out.push({ kind: 'climb', row: climb as T & { previous: number } });
  }

  return out.slice(0, max);
}
