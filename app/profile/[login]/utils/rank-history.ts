import { rankOf } from './profile-summary';
import { UserRankProp } from '@/types/ranking.types';

type Ranks = Parameters<typeof rankOf>[0];
type Snapshot = Partial<Record<UserRankProp, number>>;

export type RankHistoryCell = { rank?: number; score?: number };

export type RankHistoryRow = {
  /** `YYYY-MM-DD` of the monthly snapshot, or null for the current values. */
  date: string | null;
  label: string;
  cells: Record<UserRankProp, RankHistoryCell>;
};

export type RankHistory = { columns: UserRankProp[]; rows: RankHistoryRow[] };

type RankHistoryInput = {
  ranks?: Ranks;
  scores: { s?: number | null; c?: number | null; f?: number | null };
  /** Monthly rank snapshots, keyed by the first day of the month. */
  rankSnapshots?: unknown;
  /** Monthly score snapshots, keyed the same way. */
  scoreSnapshots?: unknown;
  months?: number;
};

const PROPS = [UserRankProp.s, UserRankProp.c, UserRankProp.f] as const;
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

const positive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** Snapshots arrive as untyped JSON: keep the dated entries and their numeric values only. */
function parseSnapshots(value: unknown): Map<string, Snapshot> {
  const snapshots = new Map<string, Snapshot>();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return snapshots;
  }

  for (const [date, snapshot] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      continue;
    }

    if (!snapshot || typeof snapshot !== 'object') {
      continue;
    }

    const values = snapshot as Record<string, unknown>;
    snapshots.set(date, Object.fromEntries(PROPS.map((prop) => [prop, positive(values[prop])])));
  }

  return snapshots;
}

/**
 * The current ranks and scores, then one row per monthly rank snapshot, newest first. A month with a
 * score but no rank snapshot is left out rather than shown as not ranked. Empty when there is no
 * snapshot to compare with; only the rankings the profile has been ranked in get a column.
 */
export function buildRankHistory({
  ranks,
  scores,
  rankSnapshots,
  scoreSnapshots,
  months = 6,
}: RankHistoryInput): RankHistory {
  const rankByDate = parseSnapshots(rankSnapshots);
  const scoreByDate = parseSnapshots(scoreSnapshots);
  const dates = [...rankByDate.keys()].toSorted((a, b) => b.localeCompare(a)).slice(0, months);

  const current: RankHistoryRow = {
    date: null,
    label: 'Current',
    cells: Object.fromEntries(
      PROPS.map((prop) => [prop, { rank: rankOf(ranks, prop), score: positive(scores[prop]) }]),
    ) as RankHistoryRow['cells'],
  };

  const monthly = dates.map<RankHistoryRow>((date) => ({
    date,
    label: DATE_FORMAT.format(new Date(date)),
    cells: Object.fromEntries(
      PROPS.map((prop) => [prop, { rank: rankByDate.get(date)?.[prop], score: scoreByDate.get(date)?.[prop] }]),
    ) as RankHistoryRow['cells'],
  }));

  const rows = [current, ...monthly];
  const columns = PROPS.filter((prop) => rows.some((row) => row.cells[prop].rank));

  if (!columns.length || !monthly.some((row) => columns.some((prop) => row.cells[prop].rank))) {
    return { columns: [], rows: [] };
  }

  return { columns, rows };
}
