import { BookOpen, ThumbsUp, Users } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

import { Figure } from '@/components/learn/course/course-header';
import { Marked } from '@/components/learn/course/course-lessons';
import { SQUARE_CLASS } from '@/components/learn/course/course-marks';
import {
  countWords,
  courseBarLabelOf,
  courseBarOf,
  courseCardStandingOf,
  goodShareOf,
  goodShareWords,
  type LearnCourseCard,
  type LearnCourseMineCard,
  learnersOf,
  learnersWords,
  lessonsWords,
  type MarkedText,
} from '@/lib/learn/course';
import { coursePath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

/*
 * A course on the list of all courses (page 24): one link with three lines, its name, what it covers and its numbers.
 * A learner's figure takes the place of the lesson count, and a bar on the bottom edge shows their depths; nothing
 * is added beside or under the course, so a card keeps its size in every state.
 */

/** A public number: an icon and the number; the words for a screen reader, and in a tooltip when pointed at. */
function Stat({
  icon: Icon,
  shown,
  words,
  full,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  shown: string;
  words: string;
  full: string;
}) {
  return (
    <span className="group/stat relative inline-flex items-center gap-1 whitespace-nowrap">
      <Icon className="size-[13px] shrink-0" aria-hidden="true" />
      <span className="font-mono font-semibold text-foreground tabular-nums">{shown}</span>
      <span className="sr-only"> {words}</span>
      <span
        className="pointer-events-none absolute bottom-6 left-1/2 z-[2] hidden -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium whitespace-nowrap text-background shadow-sm group-hover/stat:block"
        aria-hidden="true"
      >
        {full}
      </span>
    </span>
  );
}

/** The bar's colours: a depth's square colour, grey for marked as known. */
const BAR_CLASS = {
  mastered: SQUARE_CLASS.mastered,
  practised: SQUARE_CLASS.practised,
  learned: SQUARE_CLASS.learned,
  known: SQUARE_CLASS.known,
} as const;

/** A course's numbers line: the lessons, or the learner's figure in their place; then learners and the rating. */
export function CourseStats({
  course,
  mine,
  className,
}: {
  course: LearnCourseCard;
  mine: LearnCourseMineCard | null;
  className?: string;
}) {
  const learners = learnersOf(course.numbers);
  const good = goodShareOf(course.numbers);
  const standing = mine ? courseCardStandingOf(mine, course.lessons) : null;
  let lessons: ReactNode = lessonsWords(course.lessons);
  if (standing) {
    lessons = (
      <>
        {standing.learned && standing.all ? (
          <span className="font-medium text-foreground">
            All <Figure count={standing.learned.count ?? course.lessons} />
            {standing.learned.words}
          </span>
        ) : standing.learned ? (
          <span className="text-foreground">
            <Figure count={standing.learned.count ?? 0} />
            {standing.learned.words}
          </span>
        ) : null}
        {standing.known !== null ? (
          <>
            {standing.learned ? ' · ' : null}
            <Figure count={standing.known} /> marked as known
          </>
        ) : null}
      </>
    );
  }
  return (
    <span
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}
      data-course-stats=""
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <BookOpen className="size-[13px] shrink-0" aria-hidden="true" />
        <span>{lessons}</span>
      </span>
      {learners !== null ? (
        <Stat icon={Users} shown={countWords(learners)} words="learners" full={learnersWords(learners)} />
      ) : null}
      {good !== null ? (
        <Stat icon={ThumbsUp} shown={`${good}%`} words="rate it good" full={goodShareWords(good)} />
      ) : null}
    </span>
  );
}

/** A course on the list: one link to its page. */
export function CourseCard({
  course,
  name,
  mine,
}: {
  course: LearnCourseCard;
  /** The name as the search marked it. */
  name?: MarkedText;
  mine: LearnCourseMineCard | null;
}) {
  const bar = mine ? courseBarOf(mine, course.lessons) : [];
  return (
    <li className="min-w-0">
      <Link
        href={coursePath(course.slug)}
        className="relative flex h-full min-w-0 flex-col gap-1 overflow-hidden rounded-xl border bg-card px-4 py-3.5 hover:bg-accent"
        data-course-card={course.slug}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="m-0 text-base font-semibold">
            <Marked text={name ?? { text: course.name }} tone="courses" />
          </h3>
        </span>
        <span className="text-sm text-muted-foreground">{course.covers}</span>
        <CourseStats course={course} mine={mine} className="mt-0.5" />
        {mine && bar.length ? (
          <span
            className="absolute inset-x-0 bottom-0 flex h-[5px] bg-muted"
            role="img"
            aria-label={courseBarLabelOf(mine, course.lessons)}
          >
            {bar.map((part) => (
              <span key={part.kind} className={BAR_CLASS[part.kind]} style={{ width: `${part.share}%` }} />
            ))}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
