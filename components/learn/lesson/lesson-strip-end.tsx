import type { LessonPlace, LessonSquare } from '@/lib/learn/lesson-page';
import { cn } from '@/lib/utils';

/** A square's look by depth: the primary colour mixed in at 28%, 62% and 100%; muted for not yet; dashed for paused. */
export const DEPTH_SQUARE_CLASS: Record<LessonSquare, string> = {
  none: 'bg-muted',
  current: 'bg-card shadow-[inset_0_0_0_2px_var(--primary)]',
  learned: 'bg-[color-mix(in_oklch,var(--primary)_28%,var(--muted))]',
  practised: 'bg-[color-mix(in_oklch,var(--primary)_62%,var(--muted))]',
  mastered: 'bg-primary',
  paused: 'border-[1.5px] border-dashed border-muted-foreground opacity-70',
};

/** The group's lessons as squares, by depth, this lesson ringed until it is learned. */
export function DepthSquares({ squares }: { squares: readonly LessonSquare[] }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true" data-depth-squares="">
      {squares.map((square, index) => (
        // Squares never move: the index is the lesson.
        <span
          key={index}
          className={cn('inline-block size-4 rounded-[4px]', DEPTH_SQUARE_CLASS[square])}
          data-square={square}
        />
      ))}
    </span>
  );
}

/**
 * The strip's right side on a lesson: "Lesson 3 of 9" for a visitor; for a member, the group's squares by depth and
 * "3 of 9 learned", or, with nothing of the group learned yet, "9 lessons" beside them: never a zero.
 */
export function LessonStripEnd({ place }: { place: LessonPlace }) {
  if (!place.squares || place.learned === null) {
    return (
      <span className="text-sm text-muted-foreground" data-lesson-run="">
        Lesson {place.index + 1} of {place.count}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-3 text-sm text-muted-foreground" data-lesson-run="">
      <DepthSquares squares={place.squares} />
      {/*
        Wide enough for "12 of 12 learned" either way, so the first learned lesson moves and wraps nothing: the squares
        stay put and the strip keeps its line.
      */}
      <span className="inline-block min-w-[16ch] text-right whitespace-nowrap" data-lesson-count="">
        {place.learned > 0 ? (
          <>
            <span className="font-mono font-semibold text-foreground tabular-nums">{place.learned}</span> of{' '}
            {place.squares.length} learned
          </>
        ) : place.squares.length === 1 ? (
          'One lesson'
        ) : (
          `${place.squares.length} lessons`
        )}
      </span>
    </span>
  );
}
