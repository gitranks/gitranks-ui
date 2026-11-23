'use client';

import { Check, Search, X } from 'lucide-react';
import Link from 'next/link';
import { Fragment, type RefObject } from 'react';

import { CountLine } from './course-header';
import { CourseMark, SquareCard } from './course-marks';
import { Kbd } from '@/components/learn/question/kbd';
import {
  type CourseFilter,
  type CourseSearchGroup,
  type CourseSquare,
  countWords,
  groupHeadOf,
  groupSquaresCountOf,
  groupStandingOf,
  LEVEL_WORDS,
  type LearnCourseLessonMine,
  type MarkedText,
  markedTextOf,
  passesFilter,
  squareLabelOf,
} from '@/lib/learn/course';
import type { LearnCourseGroup, LearnGroupLesson } from '@/lib/learn/lesson-page';
import { learnLessonPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

/*
 * A course's lessons (page 2): the filters, the search and the view's switch; the list of groups; and the Squares
 * view, one row of squares a group, each square with its card.
 */

/** The view of a course's lessons, kept in the browser. */
export type CourseLessonsView = 'list' | 'squares';

const MARK_CLASS = {
  course: 'rounded-[3px] bg-[color-mix(in_oklch,var(--primary)_20%,transparent)] text-inherit',
  courses: 'rounded-sm bg-brand-soft px-px text-brand-soft-foreground',
};

/** A text with its match marked: softly in a course's lessons, in the brand's colour on all courses. */
export function Marked({ text, tone = 'course' }: { text: MarkedText; tone?: keyof typeof MARK_CLASS }) {
  if ('text' in text) return text.text;
  return (
    <>
      {text.before}
      <mark className={MARK_CLASS[tone]}>{text.mark}</mark>
      {text.after}
    </>
  );
}

const FILTERS: [CourseFilter, string][] = [
  ['all', 'All'],
  ['to-learn', 'To learn'],
  ['due', 'Due now'],
];

/** The bar above the lessons: the filters (a learner only), the search, and the view's switch (not on a phone). */
export function CourseToolbar({
  learner,
  filter,
  counts,
  onFilter,
  query,
  onQuery,
  view,
  onView,
  hints,
  inputRef,
}: {
  learner: boolean;
  filter: CourseFilter;
  counts: Record<CourseFilter, number>;
  onFilter: (filter: CourseFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  view: CourseLessonsView;
  onView: (view: CourseLessonsView) => void;
  hints: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      {learner ? (
        <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
          <legend className="sr-only">Show</legend>
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => onFilter(id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                filter === id
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {label}
              {/* No page shows a zero: a filter with nothing in it keeps its name alone. */}
              {counts[id] > 0 ? <span className="ml-1 font-mono tabular-nums">{countWords(counts[id])}</span> : null}
            </button>
          ))}
        </fieldset>
      ) : null}
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <label className="relative block w-full text-sm sm:w-60">
          <span className="pointer-events-none absolute top-1/2 left-[9px] flex -translate-y-1/2 text-muted-foreground">
            <Search className="size-[15px]" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            type="text"
            aria-label="Find a lesson in this course"
            placeholder="Find a lesson"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onQuery('');
            }}
            className={cn(
              'h-8 w-full rounded-md border bg-background pr-8 pl-[30px] text-sm text-foreground outline-none',
              query && 'border-foreground',
            )}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear the search"
              onClick={() => onQuery('')}
              className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 text-muted-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : hints ? (
            <span className="absolute top-1/2 right-[5px] flex -translate-y-1/2">
              <Kbd>/</Kbd>
            </span>
          ) : null}
        </label>
        {learner ? (
          <fieldset className="m-0 inline-flex shrink-0 items-center gap-0.5 rounded-md border p-0.5 max-sm:hidden">
            <legend className="sr-only">View</legend>
            {(['list', 'squares'] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => onView(id)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs',
                  view === id
                    ? 'bg-muted font-semibold text-foreground'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {id === 'list' ? 'List' : 'Squares'}
              </button>
            ))}
          </fieldset>
        ) : null}
      </div>
    </div>
  );
}

/** A lesson's row in the list: its square (or its place, for a visitor), its title, its pills, its level. */
function LessonRow({
  lesson,
  place,
  square,
  learner,
  query,
}: {
  lesson: LearnGroupLesson;
  place: number;
  square: CourseSquare;
  learner: boolean;
  query: string;
}) {
  const lead = learner ? (
    <CourseMark square={square} />
  ) : (
    <span className="w-4 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{place}</span>
  );
  const title = <Marked text={markedTextOf(lesson.title, query)} />;
  const level = (
    <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{LEVEL_WORDS[lesson.level]}</span>
  );
  if (square.kind === 'paused') {
    // A paused lesson keeps its place: its name turns grey, it says so, and it is not a link.
    return (
      <li className="flex break-inside-avoid items-center gap-3 rounded-lg px-2 text-sm" data-paused="">
        <span className="flex min-w-0 flex-1 items-center gap-3 py-2">
          {lead}
          <span className="min-w-0 flex-1 text-muted-foreground">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
            Paused
          </span>
        </span>
        {level}
      </li>
    );
  }
  return (
    <li className="flex break-inside-avoid items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent">
      <Link
        href={learnLessonPath(lesson.slug)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2"
        aria-label={learner ? squareLabelOf(lesson.title, square) : undefined}
      >
        {lead}
        <span className={cn('min-w-0 flex-1', square.kind === 'next' && 'font-semibold')}>{title}</span>
        {square.kind === 'next' ? (
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            Next
          </span>
        ) : null}
        {square.due ? (
          <span className="rounded-full border border-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-foreground">
            Due now
          </span>
        ) : null}
      </Link>
      {level}
    </li>
  );
}

/** The list of a course's lessons by group: as found by the search and passed by the filter; a group with none hides. */
export function CourseList({
  found,
  squareOf,
  mine,
  learner,
  query,
  filter,
}: {
  found: CourseSearchGroup[];
  squareOf: (lesson: LearnGroupLesson) => CourseSquare;
  mine: Map<string, LearnCourseLessonMine>;
  learner: boolean;
  query: string;
  filter: CourseFilter;
}) {
  return (
    <div className="flex flex-col gap-8">
      {found.map(({ group, byName, lessons }) => {
        const shown = lessons.filter((lesson) => passesFilter(squareOf(lesson), filter));
        if (!shown.length) return null;
        const standing = groupStandingOf(group, mine);
        // While searching or filtering, every group found says how many of its lessons show.
        const narrowed = query !== '' || filter !== 'all';
        const id = `group-${group.slug}`;
        return (
          <section key={group.slug} className="flex flex-col gap-2" aria-labelledby={id}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
              <h2 id={id} className="m-0 text-lg font-semibold tracking-tight">
                {byName ? <Marked text={markedTextOf(group.name, query)} /> : group.name}
              </h2>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                {narrowed ? (
                  <span>
                    <CountLine
                      parts={[{ count: shown.length, words: ` of ${countWords(group.lessons.length)} shown` }]}
                    />
                  </span>
                ) : (
                  <>
                    {learner && standing.done ? (
                      <span className="inline-flex items-center gap-1 font-medium text-positive">
                        <Check className="size-4" aria-hidden="true" />
                        Done
                      </span>
                    ) : null}
                    <span>
                      <CountLine
                        parts={learner ? groupHeadOf(standing) : groupHeadOf({ ...standing, learned: 0, known: 0 })}
                      />
                    </span>
                  </>
                )}
              </span>
            </div>
            <ol className="m-0 list-none gap-10 p-0 sm:columns-2">
              {shown.map((lesson) => (
                <LessonRow
                  key={lesson.slug}
                  lesson={lesson}
                  place={group.lessons.indexOf(lesson) + 1}
                  square={squareOf(lesson)}
                  learner={learner}
                  query={query}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The Squares view: one row a group, one square a lesson, in order. A square the search or the filter leaves out
 * fades, so nothing moves. Pointing at a square, or reaching it with the keyboard, shows its card over the page.
 */
export function CourseSquares({
  groups,
  squareOf,
  mine,
  visible,
  openCard = null,
}: {
  groups: LearnCourseGroup[];
  squareOf: (lesson: LearnGroupLesson) => CourseSquare;
  mine: Map<string, LearnCourseLessonMine>;
  visible: (lesson: LearnGroupLesson) => boolean;
  /** A square whose card shows open, as a board draws it. */
  openCard?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-col divide-y rounded-xl border bg-card px-5 py-2">
        {groups.map((group) => (
          <li key={group.slug} className="grid grid-cols-[17rem_minmax(0,1fr)_auto] items-center gap-4 py-2.5">
            <span className="text-sm font-medium">{group.name}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              {group.lessons.map((lesson) => {
                const square = squareOf(lesson);
                const card = (
                  <span
                    className={cn(
                      'absolute top-[30px] -left-2 z-[2]',
                      lesson.slug === openCard ? 'block' : 'hidden group-hover:block group-focus-visible:block',
                    )}
                  >
                    <SquareCard group={group.name} level={lesson.level} title={lesson.title} square={square} />
                  </span>
                );
                const faded = !visible(lesson);
                const shared = {
                  'aria-label': squareLabelOf(lesson.title, square),
                  className: cn('group relative inline-flex', faded && 'opacity-[.18]'),
                };
                return (
                  <Fragment key={lesson.slug}>
                    {square.kind === 'paused' ? (
                      // A paused lesson is not a link; its square still shows its card, to the keyboard too.
                      <button type="button" {...shared}>
                        <CourseMark square={square} size={22} />
                        {card}
                      </button>
                    ) : (
                      <Link href={learnLessonPath(lesson.slug)} {...shared}>
                        <CourseMark square={square} size={22} />
                        {card}
                      </Link>
                    )}
                  </Fragment>
                );
              })}
            </span>
            <span className="text-sm whitespace-nowrap text-muted-foreground">
              <CountLine parts={[groupSquaresCountOf(groupStandingOf(group, mine))]} />
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-xs text-muted-foreground">
        One square is one lesson, in order. Point at a square to see the lesson, or click it to open it.
      </p>
    </div>
  );
}
