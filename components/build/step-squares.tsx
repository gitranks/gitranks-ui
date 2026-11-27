import { cn } from '@/lib/utils';

/** How each square of a build's steps is drawn: done, the step in hand, or to come. */
const SQUARE_CLASS = {
  done: 'bg-brand-soft-foreground',
  current: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground)]',
  to_come: 'bg-muted shadow-[inset_0_0_0_1px_var(--border)]',
} as const;

/**
 * A build's steps as a row of squares, one a step: the ones before `current` done, `current` ringed, the rest to come.
 * A picture of what the words beside it already say, so a screen reader skips it.
 */
export function StepSquares({ current, of, className }: { current: number; of: number; className?: string }) {
  const count = Math.max(0, Math.floor(of));
  return (
    <span className={cn('flex flex-wrap items-center gap-[5px]', className)} aria-hidden="true" data-step-squares="">
      {Array.from({ length: count }, (_, index) => {
        const number = index + 1;
        const kind = number < current ? 'done' : number === current ? 'current' : 'to_come';
        return (
          <span key={number} className={cn('block size-3.5 rounded-[3px]', SQUARE_CLASS[kind])} data-square={kind} />
        );
      })}
    </span>
  );
}
