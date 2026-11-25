import { DEPTH_SQUARE_CLASS } from '@/components/learn/lesson/lesson-strip-end';
import { type CourseSquare, type CourseSquareKind, LEVEL_WORDS, SQUARE_WORDS, squareHintOf } from '@/lib/learn/course';
import type { LearnLessonLevel } from '@/lib/learn/lesson-page';
import { cn } from '@/lib/utils';

/*
 * The marks of a course's page: a lesson's square by its state, the legend of the squares, and the card a
 * square shows when pointed at. Every mark has a fixed size, so a mark never moves what it marks.
 */

/** A square's look: the lesson strip's depth colours, grey for marked as known. */
export const SQUARE_CLASS: Record<CourseSquareKind, string> = {
  none: DEPTH_SQUARE_CLASS.none,
  next: DEPTH_SQUARE_CLASS.current,
  learned: DEPTH_SQUARE_CLASS.learned,
  practised: DEPTH_SQUARE_CLASS.practised,
  mastered: DEPTH_SQUARE_CLASS.mastered,
  paused: DEPTH_SQUARE_CLASS.paused,
  known: 'bg-[color-mix(in_oklch,var(--muted-foreground)_42%,var(--muted))]',
};

/** The ring of a lesson the review asks now: dark, with a thin gap. */
const DUE_RING = 'shadow-[inset_0_0_0_2px_var(--foreground),inset_0_0_0_3.5px_var(--background)]';

/** A lesson's square: 16 pixels in a list and a legend, 22 in the Squares view. */
export function CourseMark({ square, size = 16 }: { square: CourseSquare; size?: 16 | 22 }) {
  return (
    <span
      aria-hidden="true"
      data-square={square.kind}
      data-due={square.due ? '' : undefined}
      data-paused={square.paused ? '' : undefined}
      className={cn(
        'inline-flex shrink-0 rounded-[4px]',
        size === 16 ? 'size-4' : 'size-[22px]',
        SQUARE_CLASS[square.kind],
        // A paused lesson the learner had learned keeps its colour, faint and edged as a paused one.
        square.paused && 'border-[1.5px] border-dashed border-muted-foreground opacity-70',
        square.due && DUE_RING,
      )}
    />
  );
}

/** The legend's items, in the board's order. */
const LEGEND: [string, CourseSquare][] = [
  ['Not started', { kind: 'none', due: false }],
  ['Marked as known', { kind: 'known', due: false }],
  ['Learned', { kind: 'learned', due: false }],
  ['Practised', { kind: 'practised', due: false }],
  ['Mastered', { kind: 'mastered', due: false }],
  ['Due now', { kind: 'learned', due: true }],
];

/** What the squares mean. */
export function CourseLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {LEGEND.map(([label, square]) => (
        <span key={label} className="inline-flex items-center gap-2">
          <CourseMark square={square} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** The card a square shows when pointed at or reached with the keyboard: its group and level, title, state, action. */
export function SquareCard({
  group,
  level,
  title,
  square,
}: {
  group: string;
  level: LearnLessonLevel;
  title: string;
  square: CourseSquare;
}) {
  const hint = squareHintOf(square);
  return (
    <span
      role="tooltip"
      className="flex w-[280px] flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm"
      data-square-card=""
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {group} · {LEVEL_WORDS[level]}
        </span>
        {square.kind === 'next' ? (
          <span className="shrink-0 rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-brand-soft-foreground uppercase">
            Next for you
          </span>
        ) : null}
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="flex items-center gap-2 text-xs text-foreground">
        <CourseMark square={{ kind: square.kind, due: false }} />
        <span>
          {square.kind === 'paused'
            ? 'Paused: we are correcting a mistake'
            : square.paused
              ? `${SQUARE_WORDS[square.kind]}. Paused: we are correcting a mistake`
              : SQUARE_WORDS[square.kind]}
          {square.due ? (
            <>
              {' · '}
              <b className="font-semibold">due now</b>
            </>
          ) : null}
        </span>
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </span>
  );
}
