import { cn } from '@/lib/utils';

/** Who a rail's dot marks: the agent, anyone else, the end (filled), or a stop (filled, grey); none on a heading. */
export type RailDot = 'agent' | 'other' | 'end' | 'stopped' | null;

/** A timeline's row: the time, the rail, the row's words. Each row is a `group/row`, so the rail knows the first and last. */
export const RAIL_ROW = 'group/row grid grid-cols-[3rem_1rem_minmax(0,1fr)] gap-x-3';

/** The rail between the time and the row: a line through every row, a dot on each, filled on the last. */
export function Rail({ dot }: { dot: RailDot }) {
  return (
    <span className="relative flex justify-center before:absolute before:inset-y-0 before:w-0.5 before:bg-border group-first/row:before:top-2.5 group-last/row:before:bottom-auto group-last/row:before:h-2.5">
      {dot ? (
        <span
          data-who={dot}
          className={cn(
            'relative mt-1 size-3 rounded-full border-2 bg-background',
            dot === 'other' || dot === 'stopped' ? 'border-muted-foreground' : 'border-primary',
            dot === 'end' && 'bg-primary',
            dot === 'stopped' && 'bg-muted-foreground',
          )}
        />
      ) : null}
    </span>
  );
}
