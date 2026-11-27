import { Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { interviewRoundAnchor } from '@/lib/interviews/paths';
import type { RoundLineMark, RoundPoint, RoundSegment } from '@/lib/interviews/round-line';
import { cn } from '@/lib/utils';

/*
 * The rounds of a plan on one line: a column with a point for each round and the line between them, and beside it
 * what each round shows. `roundLineOf` (lib/interviews/round-line.ts) says which point and which piece of line each
 * round gets; the parts here only draw them, so the plan's page and the connecting screen draw the same line.
 */

const DASHED: CSSProperties = {
  backgroundImage: 'linear-gradient(var(--border) 55%, transparent 0)',
  backgroundSize: '2px 8px',
};

/** A piece of the line, by its kind. */
const segmentStyle = (segment: RoundSegment): CSSProperties => {
  if (segment === 'solid') return { background: 'var(--brand-soft-foreground)' };
  if (segment === 'grey') return { background: 'var(--border)' };
  if (segment === 'dashed') return DASHED;
  return { background: 'transparent' };
};

/** A piece of the line: a fixed height above the point, or the rest of the row below it. */
function Segment({ segment, height }: { segment: RoundSegment; height?: number }) {
  return (
    <span
      aria-hidden="true"
      data-round-segment={segment}
      className={cn('w-0.5', height === undefined ? 'flex-1' : 'flex-none')}
      style={{ ...segmentStyle(segment), ...(height === undefined ? {} : { height }) }}
    />
  );
}

const POINT = 'inline-flex size-7 flex-none items-center justify-center rounded-full';

/**
 * A round's point: a tick once done, else its number, ringed for the round the person is in or started. `className`:
 * another size, where a line draws smaller points.
 */
export function RoundPointMark({
  point,
  number,
  className,
}: {
  point: RoundPoint;
  number: number;
  className?: string;
}) {
  if (point === 'done') {
    return (
      <span
        data-round-point="done"
        className={cn(POINT, className)}
        style={{ background: 'var(--brand-soft-foreground)', color: 'var(--background)' }}
      >
        <Check aria-hidden="true" className="size-4" />
        <span className="sr-only">Round {number}, done</span>
      </span>
    );
  }
  const look: Record<Exclude<RoundPoint, 'done'>, CSSProperties> = {
    here: {
      background: 'var(--brand-soft)',
      boxShadow: 'inset 0 0 0 2px var(--brand-soft-foreground)',
      color: 'var(--brand-soft-foreground)',
    },
    started: {
      background: 'var(--background)',
      boxShadow: 'inset 0 0 0 2px var(--brand-soft-foreground)',
      color: 'var(--brand-soft-foreground)',
    },
    plain: { background: 'var(--background)', boxShadow: 'inset 0 0 0 1px var(--border)' },
  };
  return (
    <span
      data-round-point={point}
      className={cn(
        POINT,
        'font-mono text-xs font-semibold tabular-nums',
        point === 'plain' && 'text-muted-foreground',
        className,
      )}
      style={look[point]}
    >
      {number}
    </span>
  );
}

/** The line's list: one row for each round, then the rows after the interviews. */
export function RoundLine({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn('m-0 flex list-none flex-col p-0', className)}>{children}</ol>;
}

const ROW = 'grid grid-cols-[28px_minmax(0,1fr)] gap-x-3.5';
const COLUMN = 'flex flex-col items-center';

/** One round on the line: its point between the pieces of line above and below it, and what the round shows. */
export function RoundLineRow({
  mark,
  last = false,
  children,
}: {
  mark: RoundLineMark;
  /** The last row of the whole line: no room under it. */
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      id={interviewRoundAnchor(mark.number)}
      data-round-row={mark.number}
      data-round-point-kind={mark.point}
      className={cn(ROW, 'scroll-mt-6')}
    >
      <div className={COLUMN}>
        <Segment segment={mark.above} height={14} />
        <RoundPointMark point={mark.point} number={mark.number} />
        <Segment segment={mark.below} />
      </div>
      <div className={last ? 'pb-0' : mark.below === 'dashed' ? 'pb-4.5' : 'pb-3.5'}>{children}</div>
    </li>
  );
}

/**
 * A row on the dashed part after the rounds: a small open dot for a stage that happens (`dot`), none for the part's
 * heading. `last` ends the line.
 */
export function RoundLineAfterRow({
  dot = true,
  last = false,
  children,
}: {
  dot?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li data-round-after={dot ? 'stage' : 'heading'} className={ROW}>
      <div className={COLUMN}>
        {dot && (
          <span
            aria-hidden="true"
            className="my-2 block size-3 flex-none rounded-full"
            style={{ background: 'var(--background)', boxShadow: 'inset 0 0 0 2px var(--border)' }}
          />
        )}
        <Segment segment={last ? 'none' : 'dashed'} />
      </div>
      <div className={last ? 'pb-0' : dot ? 'pb-2' : 'pb-1.5'}>{children}</div>
    </li>
  );
}
