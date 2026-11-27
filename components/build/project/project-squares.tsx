import type { ProgressSquare } from '@/lib/build/project';
import { cn } from '@/lib/utils';

const SQUARE: Record<ProgressSquare, string> = {
  done: 'bg-brand-soft-foreground',
  current: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground)]',
  todo: 'bg-muted shadow-[inset_0_0_0_1px_var(--border)]',
};

/**
 * A build's steps as small squares: passed ones filled, the step in hand outlined, the rest empty. Only a picture: the
 * words beside it say the same.
 */
export function ProjectSquares({ squares }: { squares: readonly ProgressSquare[] }) {
  return (
    <span data-project-squares className="flex flex-wrap items-center gap-[5px]" aria-hidden="true">
      {squares.map((square, index) => (
        <span key={index} data-square={square} className={cn('block size-3.5 rounded-[3px]', SQUARE[square])} />
      ))}
    </span>
  );
}
