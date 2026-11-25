'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CourseCard } from './course-card';
import { CountLine } from '@/components/learn/course/course-header';
import { Marked } from '@/components/learn/course/course-lessons';
import { CourseMark, SQUARE_CLASS } from '@/components/learn/course/course-marks';
import { useCoursePageKeys } from '@/components/learn/course/use-course-keys';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/workspace/kbd';
import {
  type CourseSectionKind,
  type CourseSquareKind,
  countWords,
  coursesSearchOf,
  foundWordsOf,
  LESSONS_SHOWN_FIRST,
  type LearnCourseCard,
  type LearnCourseMineCard,
  type LearnLessonListItem,
  markedTextOf,
  SQUARE_WORDS,
} from '@/lib/learn/course';
import type { LearnDepth } from '@/lib/learn/lesson-page';
import { coursesSearchPath, LEARN_COURSES_MARKDOWN_PATH, learnLessonPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/** Everything the list of all courses draws from: plain data, the same for everyone but the learner's side. */
export type CoursesViewProps = {
  courses: readonly LearnCourseCard[];
  /** Every live lesson, for the search. */
  lessons: readonly LearnLessonListItem[];
  /** The signed-in person's courses; null for a visitor. */
  mine: readonly LearnCourseMineCard[] | null;
  /** The learner's depth on each lesson of the courses they started, for the squares of the lessons found; null until read. */
  depths: Readonly<Record<string, LearnDepth>> | null;
  /** Called once the search shows a lesson of a course the learner started: its square needs the depths. */
  onSquaresShown?: () => void;
  /** What the address's `?q=` carried. */
  query?: string;
  /** For the catalogue: the lessons opened in place, and the key hints. */
  drawn?: { allLessons?: boolean };
  hints?: boolean;
};

/** Each section's heading id, a link's target. */
const SECTION_IDS: Record<CourseSectionKind, string> = { TOPIC: 'topics', LANGUAGE: 'languages', PROJECT: 'projects' };

const SQUARE_OF_DEPTH: Record<LearnDepth, CourseSquareKind> = {
  NONE: 'none',
  LEARNED: 'learned',
  PRACTISED: 'practised',
  MASTERED: 'mastered',
};

/** What the colours of the bar mean: shown to a learner beside the search. */
function BarLegend() {
  return (
    <ul
      className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground"
      aria-label="What the colours of your progress mean"
    >
      {(['learned', 'practised', 'mastered'] as const).map((kind) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <span className={cn('inline-block size-2.5 shrink-0 rounded-[3px]', SQUARE_CLASS[kind])} />
          {SQUARE_WORDS[kind]}
        </li>
      ))}
    </ul>
  );
}

/** A lesson the search found: a link to it, its course and group under its name; a learner's square before it. */
function FoundLesson({
  lesson,
  query,
  learner,
  depth,
}: {
  lesson: LearnLessonListItem;
  query: string;
  learner: boolean;
  /** The learner's depth on it; null until it is known. */
  depth: LearnDepth | null;
}) {
  const kind = depth ? SQUARE_OF_DEPTH[depth] : null;
  return (
    <li className="min-w-0">
      <Link
        href={learnLessonPath(lesson.slug)}
        className="flex h-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent"
      >
        {kind ? (
          <>
            <CourseMark square={{ kind, due: false }} />
            <span className="sr-only">{SQUARE_WORDS[kind]}. </span>
          </>
        ) : learner ? (
          // A learner's square has its place before the depth is known, so the title never moves.
          <span className="size-4 shrink-0" aria-hidden="true" data-square-slot="" />
        ) : null}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">
            <Marked text={markedTextOf(lesson.title, query)} tone="courses" />
          </span>
          <span className="text-xs text-muted-foreground">
            {lesson.course.title} · {lesson.group.title}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * All courses (page 24): the search, then one section of courses a kind, each course a link to its page; a learner's
 * own figures in place on the courses they started. The search filters as it is typed: courses by name or kind, then
 * lessons by name, in every course; the address keeps what was typed.
 */
export function CoursesView({
  courses,
  lessons,
  mine,
  depths,
  onSquaresShown,
  query: start = '',
  drawn = {},
  hints: hintsGiven,
}: CoursesViewProps) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const [query, setQuery] = useState(start);
  const [allLessons, setAllLessons] = useState(drawn.allLessons ?? false);
  const inputRef = useRef<HTMLInputElement>(null);

  const type = useCallback((typed: string) => {
    setQuery(typed);
    setAllLessons(false);
    // The address keeps what was typed, without a step in the history for each letter.
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', coursesSearchPath(typed.trim()));
    }
  }, []);
  const clear = useCallback(() => type(''), [type]);
  useCoursePageKeys({ inputRef, onClear: clear });
  // A button that clears goes away with the search: the field takes the focus, where a new search starts.
  const showAll = () => {
    clear();
    inputRef.current?.focus();
  };

  const search = useMemo(() => coursesSearchOf(courses, lessons, query), [courses, lessons, query]);
  // What was found shows beside the field only for a search: the full list counts nothing.
  const found = search.query ? foundWordsOf(search) : null;
  const mineOf = useMemo(() => new Map((mine ?? []).map((card) => [card.course.slug, card])), [mine]);
  const learner = mine !== null;
  const shownLessons = allLessons ? search.lessons : search.lessons.slice(0, LESSONS_SHOWN_FIRST);
  // A lesson of a course not started is not started: only a started course's lessons wait for the depths.
  const depthOf = (lesson: LearnLessonListItem): LearnDepth | null =>
    !learner ? null : !mineOf.has(lesson.course.slug) ? 'NONE' : depths ? (depths[lesson.slug] ?? 'NONE') : null;
  const squaresShown = learner && shownLessons.some((lesson) => mineOf.has(lesson.course.slug));
  useEffect(() => {
    if (squaresShown) onSquaresShown?.();
  }, [squaresShown, onSquaresShown]);
  const rest = search.lessons.length - shownLessons.length;
  const nothing = search.query !== '' && found === null;
  // What the search found, said to a screen reader as it changes; nothing while every course shows.
  const status = !search.query
    ? ''
    : found
      ? `${found.map((part) => `${part.count ?? ''}${part.words}`).join(', ')} found.`
      : 'Nothing found.';
  // "Show N more lessons" leaves; the keyboard goes on from the first lesson it showed.
  const lessonsRef = useRef<HTMLUListElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (!allLessons || !opened.current) return;
    opened.current = false;
    lessonsRef.current?.querySelectorAll('a')[LESSONS_SHOWN_FIRST]?.focus();
  }, [allLessons]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 pt-7 pb-14">
      <h1 className="sr-only">All courses on GitRanks Learn</h1>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative block w-full text-sm sm:w-[340px]">
            <span className="pointer-events-none absolute top-1/2 left-2.5 flex -translate-y-1/2 text-muted-foreground">
              <Search className="size-[15px]" aria-hidden="true" />
            </span>
            <input
              ref={inputRef}
              type="text"
              aria-label="Find a course or a lesson"
              placeholder="Find a course or a lesson"
              value={query}
              onChange={(event) => type(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') clear();
              }}
              className={cn(
                'h-9 w-full rounded-md border bg-background pr-[34px] pl-8 text-sm text-foreground outline-none',
                query && 'border-foreground',
              )}
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear the search"
                onClick={showAll}
                className="absolute top-1/2 right-[9px] inline-flex -translate-y-1/2 text-muted-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : hints ? (
              <span className="absolute top-1/2 right-1.5 flex -translate-y-1/2">
                <Kbd>/</Kbd>
              </span>
            ) : null}
          </label>
          {found ? (
            <span className="text-sm whitespace-nowrap text-muted-foreground" data-courses-found="">
              <CountLine parts={found} />
            </span>
          ) : null}
        </div>
        {learner ? <BarLegend /> : null}
        <p className="sr-only" role="status" data-courses-status="">
          {status}
        </p>
      </div>

      {nothing ? (
        <div
          className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-5 py-6"
          data-courses-nothing=""
        >
          <p className="m-0 text-base font-medium">No course or lesson matches “{search.query}”.</p>
          <Button type="button" variant="outline" onClick={showAll}>
            Show all courses
            {hints ? <Kbd>Esc</Kbd> : null}
          </Button>
        </div>
      ) : (
        <>
          {search.sections.map((section) => {
            const id = SECTION_IDS[section.kind];
            return (
              <section key={section.kind} className="flex flex-col gap-3" aria-labelledby={id}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 id={id} className="m-0 text-xl font-bold tracking-tight">
                    {section.title}
                  </h2>
                  <span className="text-sm text-muted-foreground">{section.sub}</span>
                </div>
                <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                  {section.found.map(({ course, name }) => (
                    <CourseCard key={course.slug} course={course} name={name} mine={mineOf.get(course.slug) ?? null} />
                  ))}
                </ul>
              </section>
            );
          })}
          {search.lessons.length ? (
            <section className="flex flex-col gap-3" aria-labelledby="found-lessons">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id="found-lessons" className="m-0 text-xl font-bold tracking-tight">
                  Lessons
                </h2>
                <span className="text-sm text-muted-foreground">By name, in every course.</span>
              </div>
              <ul ref={lessonsRef} className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                {shownLessons.map((lesson) => (
                  <FoundLesson
                    key={lesson.slug}
                    lesson={lesson}
                    query={search.query}
                    learner={learner}
                    depth={depthOf(lesson)}
                  />
                ))}
              </ul>
              {rest > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    opened.current = true;
                    setAllLessons(true);
                  }}
                >
                  Show {countWords(rest)} more {rest === 1 ? 'lesson' : 'lessons'}
                </Button>
              ) : null}
            </section>
          ) : null}
        </>
      )}
      <CoursesFooter />
    </main>
  );
}

/** Who wrote the courses, the Markdown copy of the list, and the file for agents. */
function CoursesFooter() {
  return (
    <p className="m-0 border-t pt-5 text-xs text-muted-foreground">
      Written and checked by GitRanks ·{' '}
      <a href={LEARN_COURSES_MARKDOWN_PATH} className="hover:underline">
        Markdown version
      </a>{' '}
      ·{' '}
      <a href="/llms.txt" className="hover:underline">
        For agents: llms.txt
      </a>
    </p>
  );
}
