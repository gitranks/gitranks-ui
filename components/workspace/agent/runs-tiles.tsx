import { cn } from '@/lib/utils';
import { usd } from '@/lib/workspace/format';
import { type ContributeRunsTotals, percentLabel } from '@/lib/workspace/runs';

type TileCopy = { name: string; label: string; value: string; text: string; className?: string };

function Tile({ name, label, value, text, className }: TileCopy) {
  return (
    <div
      data-total={name}
      className={cn('flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3.5', className)}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

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
    value: totals.runs.toLocaleString('en-US'),
    text:
      learner && preview && atWork
        ? `${atWork} at work now`
        : notStarted
          ? `${notStarted} didn't start`
          : 'All reached the agent',
  };
  const spent: TileCopy = {
    name: 'spent',
    label: 'Spent',
    value: usd(totals.costUsd),
    text: totals.started
      ? `${usd(Math.round((totals.costUsd / totals.started) * 100) / 100)} a started run`
      : 'Nothing yet',
  };
  const prs: TileCopy = {
    name: 'prs',
    label: 'Pull requests',
    value: String(totals.prs),
    text: preview
      ? `${open} open · ${totals.merged} merged`
      : `${totals.merged} merged · ${totals.closed} closed · ${open} open`,
  };
  const mergeRate: TileCopy = {
    name: 'merge-rate',
    label: 'Merge rate',
    value: percentLabel(totals.merged, decided),
    text: `of ${decided} decided`,
  };
  const noGoRate: TileCopy = {
    name: 'no-go-rate',
    label: 'No-go rate',
    value: percentLabel(totals.noGo, totals.started),
    text: preview
      ? `${totals.noGo} of ${totals.started} started`
      : `${totals.noGo} of ${totals.started} started · ${usd(totals.noGoCostUsd)}`,
    // On the Runs page's phones the no-go card says the rate.
    className: preview ? undefined : 'max-lg:hidden',
  };
  // An older API does not count lessons: the tile is left out.
  const lessons: TileCopy | null =
    typeof totals.lessons === 'number'
      ? {
          name: 'lessons',
          label: 'Lessons written',
          value: String(totals.lessons),
          text: `${totals.lessonsPassed ?? 0} passed by you`,
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
