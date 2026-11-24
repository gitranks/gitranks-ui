import { cn } from '@/lib/utils';
import { usd } from '@/lib/workspace/format';
import { type ContributeRunsTotals, percentLabel } from '@/lib/workspace/runs';

/** A tile: `value` null when there is nothing to count or divide, and the line says so in words instead. */
type TileCopy = { name: string; label: string; value: string | null; text: string; className?: string };

function Tile({ name, label, value, text, className }: TileCopy) {
  return (
    <div
      data-total={name}
      className={cn('flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3.5', className)}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      {value === null ? (
        <span className="flex min-h-8 items-center text-sm text-muted-foreground">{text}</span>
      ) : (
        <>
          <span className="font-mono text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{text}</span>
        </>
      )}
    </div>
  );
}

/** "3 merged · 1 open": the counts that are not zero, in order; `none` when every one is. */
const countsLine = (counts: readonly [number, string][], none: string) =>
  counts
    .filter(([count]) => count > 0)
    .map(([count, word]) => `${count} ${word}`)
    .join(' · ') || none;

/** A rate's value: null with nothing to divide by. */
const rateOf = (part: number, whole: number) => (whole ? percentLabel(part, whole) : null);

const GRID: Record<number, string> = {
  3: 'sm:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

/**
 * The totals over every run the filter matches, as tiles. `history`: the Runs page's five (or a learner's four);
 * `preview`: the Agent tab's four (or a learner's three). A learner's own agent spends nothing through us: no Spent,
 * no No-go rate; their lessons instead, and in the preview the runs at work now.
 */
export function RunsTiles({
  totals,
  variant,
  learner = false,
  atWork = 0,
}: {
  totals: ContributeRunsTotals;
  variant: 'history' | 'preview';
  learner?: boolean;
  /** Runs an agent works on now, for the learner's preview. */
  atWork?: number;
}) {
  const decided = totals.merged + totals.closed;
  const open = totals.prs - decided;
  const notStarted = totals.runs - totals.started;
  const preview = variant === 'preview';

  const runs: TileCopy = {
    name: 'runs',
    label: 'Runs',
    value: totals.runs ? totals.runs.toLocaleString('en-US') : null,
    text: !totals.runs
      ? 'No runs yet'
      : learner && preview && atWork
        ? `${atWork} at work now`
        : notStarted
          ? `${notStarted} didn't start`
          : 'All reached the agent',
  };
  const spent: TileCopy = {
    name: 'spent',
    label: 'Spent',
    value: totals.costUsd > 0 ? usd(totals.costUsd) : null,
    text:
      totals.costUsd > 0 && totals.started
        ? `${usd(Math.round((totals.costUsd / totals.started) * 100) / 100)} a started run`
        : 'Nothing spent yet',
  };
  const prs: TileCopy = {
    name: 'prs',
    label: 'Pull requests',
    value: totals.prs ? String(totals.prs) : null,
    text: !totals.prs
      ? 'None opened yet'
      : preview
        ? countsLine(
            [
              [open, 'open'],
              [totals.merged, 'merged'],
            ],
            'None open or merged',
          )
        : countsLine(
            [
              [totals.merged, 'merged'],
              [totals.closed, 'closed'],
              [open, 'open'],
            ],
            'None decided yet',
          ),
  };
  const mergeRate: TileCopy = {
    name: 'merge-rate',
    label: 'Merge rate',
    value: rateOf(totals.merged, decided),
    text: decided ? `of ${decided} decided` : 'None decided yet',
  };
  const noGoCost = !preview && totals.noGoCostUsd > 0 ? ` · ${usd(totals.noGoCostUsd)}` : '';
  const noGoRate: TileCopy = {
    name: 'no-go-rate',
    label: 'No-go rate',
    value: rateOf(totals.noGo, totals.started),
    text: !totals.started
      ? 'None started yet'
      : `${totals.noGo ? `${totals.noGo} of ${totals.started}` : `None of ${totals.started}`} started${noGoCost}`,
    // On the Runs page's phones the no-go card says the rate.
    className: preview ? undefined : 'max-lg:hidden',
  };
  // An older API does not count lessons: the tile is left out.
  const lessons: TileCopy | null =
    typeof totals.lessons === 'number'
      ? {
          name: 'lessons',
          label: 'Lessons written',
          value: totals.lessons ? String(totals.lessons) : null,
          text: !totals.lessons
            ? 'None written yet'
            : totals.lessonsPassed
              ? `${totals.lessonsPassed} passed by you`
              : 'None passed by you yet',
        }
      : null;

  const tiles = (
    learner
      ? preview
        ? [runs, prs, lessons]
        : [runs, prs, mergeRate, lessons]
      : preview
        ? [runs, spent, prs, noGoRate]
        : [runs, spent, prs, mergeRate, noGoRate]
  ).filter((tile): tile is TileCopy => !!tile);

  return (
    <div
      className={cn('grid grid-cols-2 gap-3', preview && tiles.length === 4 ? 'sm:grid-cols-4' : GRID[tiles.length])}
    >
      {tiles.map((tile) => (
        <Tile key={tile.name} {...tile} />
      ))}
    </div>
  );
}
