import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode, Ref } from 'react';

import { SQUARE_CLASS } from '@/components/learn/course/course-marks';
import { Button } from '@/components/ui/button';
import {
  COURSE_KIND_LABELS,
  countWords,
  courseBarLabelOf,
  courseBarOf,
  courseCardStandingOf,
  type LearnCourseMineCard,
} from '@/lib/learn/course';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import {
  CALENDAR_WEEKS,
  CALENDAR_WEEKS_PHONE,
  type Calendar,
  coursesLineOf,
  type DayLevel,
  type DaysLine,
  type DepthRow,
  dayDoneOf,
  dayLabelOf,
  daysLineWords,
  dayTitleOf,
  finishedWordsOf,
  type HistoryEntry,
  historyDayId,
  historyEntriesOf,
  KNOWN_ONLY_LINE,
  type LearnDay,
  type LessonsBox,
  lessonsBoxWords,
  MY_PROGRESS_VIEWS,
  type MyProgressView,
  myProgressPath,
} from '@/lib/learn/my-progress';
import { dayWalkthroughHrefOf, myFixPagePath } from '@/lib/learn/my-progress-fixes';
import { coursePath, LEARN_COURSES_PATH, learnLessonPath, learnReviewPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

/*
 * My progress as the design catalogue draws it, from plain data: the boxes "Lessons" and "Days", the switch of views,
 * the course cards, History, and the pages with nothing to list (a visitor, nothing yet, a read that failed). The live
 * page (`my-progress-live.tsx`) moves them; the catalogue draws each state from a fixture. Every place keeps its size
 * while the person's side is on its way.
 */

/** The page's frame: the boxes, then the switch and its view, one under the other. */
export const MY_PROGRESS_MAIN_CLASS = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16 sm:gap-6 sm:pt-8';

/** A number as the boards write it: the mono face, in the text's colour. */
function Figure({ count }: { count: number }) {
  return <span className="font-mono font-semibold text-foreground tabular-nums">{countWords(count)}</span>;
}

/** A depth's colour, as the course's squares have it. */
const DEPTH_CLASS: Record<DepthRow['kind'], string> = {
  learned: SQUARE_CLASS.learned,
  practised: SQUARE_CLASS.practised,
  mastered: SQUARE_CLASS.mastered,
  known: SQUARE_CLASS.known,
};

/** A square of the legend or of a row: a depth's colour. */
function Swatch({ kind, size = 12 }: { kind: DepthRow['kind']; size?: 10 | 12 }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 rounded-[3px]', size === 12 ? 'size-3' : 'size-2.5', DEPTH_CLASS[kind])}
    />
  );
}

/** A box at the top: its small title, what sits beside it, then its content. */
function Box({ id, title, side, children }: { id: string; title: string; side?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex min-h-5 items-center justify-between gap-3">
        <h2 id={id} className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h2>
        {side}
      </div>
      {children}
    </section>
  );
}

/** A row of the box "Lessons": its colour, its name and what it means, its bar, its count. */
function DepthLine({ row }: { row: DepthRow }) {
  return (
    <li className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3" data-depth-row={row.kind}>
      <span className="flex items-center gap-2 sm:w-[230px] sm:flex-none">
        <Swatch kind={row.kind} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-foreground">{row.label}</span>
          <span className="text-xs text-muted-foreground">{row.hint}</span>
        </span>
        <span className="flex-none font-mono font-semibold tabular-nums sm:hidden">{countWords(row.count)}</span>
      </span>
      <span
        className="flex h-2 w-full min-w-0 flex-none overflow-hidden rounded-full bg-muted sm:w-auto sm:flex-1"
        aria-hidden="true"
      >
        <span className={DEPTH_CLASS[row.kind]} style={{ width: `${row.share}%` }} />
      </span>
      <span className="hidden w-9 flex-none text-right font-mono font-semibold tabular-nums sm:block">
        {countWords(row.count)}
      </span>
    </li>
  );
}

/** The box "Lessons": the lessons learned and a row for each depth with something in it, then marked as known apart. */
export function LessonsBoxView({ box }: { box: LessonsBox }) {
  const count = box.kind === 'learned' ? box.learned : box.known;
  return (
    <Box id="my-progress-lessons" title="Lessons">
      <p className="m-0 flex items-baseline gap-2" data-lessons-headline="">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{countWords(count)}</span>
        <span className="text-sm text-muted-foreground">{lessonsBoxWords(box)}</span>
      </p>
      {box.kind === 'known' ? (
        <p className="m-0 text-sm text-muted-foreground">{KNOWN_ONLY_LINE}</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {box.depths.map((row) => (
              <DepthLine key={row.kind} row={row} />
            ))}
          </ul>
          {box.known ? (
            <ul className="m-0 flex list-none flex-col border-t p-0 pt-3">
              <DepthLine row={box.known} />
            </ul>
          ) : null}
        </>
      )}
    </Box>
  );
}

/** A square's shade, from none to the most: the positive colour in four steps. */
const LEVEL_CLASS: Record<DayLevel, string> = {
  0: 'bg-muted',
  1: 'bg-[color-mix(in_srgb,var(--positive)_28%,var(--card))]',
  2: 'bg-[color-mix(in_srgb,var(--positive)_52%,var(--card))]',
  3: 'bg-[color-mix(in_srgb,var(--positive)_76%,var(--card))]',
  4: 'bg-positive',
};

/** The weeks a phone leaves out: the oldest ones. */
const PHONE_HIDDEN_WEEKS = CALENDAR_WEEKS - CALENDAR_WEEKS_PHONE;

/** A square's size: 13 pixels on a phone, 17 from the first breakpoint. */
const CELL = 'size-[13px] rounded-[3px] sm:size-[17px]';

/**
 * The gold border of a day a fix of the person's was merged on, inside the square so nothing moves. It is not a star:
 * on a course's page the star marks a lesson with a merged fix.
 */
export const MERGED_FIX_RING = 'shadow-[inset_0_0_0_2px_var(--warning)]';

/**
 * A day with something done: a link to it in History, with a small card when pointed at or focused. Its label says the
 * day and what was done; the card says it again for the eye. A late week's card opens to the left, to stay in the box.
 */
function DaySquare({
  day,
  level,
  merged,
  today,
  late,
  pointed,
  className,
}: {
  day: LearnDay;
  level: DayLevel;
  /** A fix of the person's was merged that day: the gold border. */
  merged: boolean;
  today: string;
  late: boolean;
  /** The catalogue's "pointed at" state: the card drawn open. */
  pointed: boolean;
  className?: string;
}) {
  return (
    <Link
      href={myProgressPath({ view: 'history', day: day.day })}
      scroll={false}
      aria-label={dayLabelOf(day, today)}
      className={cn(
        'group/day relative block outline-offset-1',
        CELL,
        LEVEL_CLASS[level],
        merged && MERGED_FIX_RING,
        className,
      )}
      data-day={day.day}
      data-level={level}
      data-merged-fix={merged ? '' : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-[calc(100%+6px)] z-[2] w-56 flex-col gap-1.5 rounded-lg border bg-card p-3 text-left shadow-sm group-hover/day:flex group-focus-visible/day:flex',
          pointed ? 'flex' : 'hidden',
          late ? 'right-0' : 'left-0',
        )}
      >
        <span className="text-xs text-muted-foreground">{dayTitleOf(day.day, today)}</span>
        {/* A day active with no lesson and no review says so, never a bare date. */}
        {(dayDoneOf(day).length ? dayDoneOf(day) : [{ words: 'Active', merged: false }]).map((done) =>
          done.merged ? (
            <span key={done.words} className="flex items-center gap-1.5 text-sm text-foreground">
              <span className={cn('inline-block size-3 shrink-0 rounded-[3px] bg-muted', MERGED_FIX_RING)} />
              {done.words}
            </span>
          ) : (
            <span key={done.words} className="text-sm text-foreground">
              {done.words}
            </span>
          ),
        )}
        <span className="text-xs text-muted-foreground">Click to see this day in History</span>
      </span>
    </Link>
  );
}

const SHADES: DayLevel[] = [0, 1, 2, 3, 4];

/** The box "Days": a square for each day of the last 26 weeks (17 on a phone), and the line of days counted. */
export function DaysBoxView({
  calendar,
  line,
  today,
  pointed = null,
}: {
  calendar: Calendar;
  line: DaysLine;
  today: string;
  /** A day whose card is drawn open, as when pointed at: the catalogue's state only. */
  pointed?: string | null;
}) {
  const words = daysLineWords(line);
  return (
    <Box
      id="my-progress-days"
      title="Days"
      side={
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
          <span>Less</span>
          {SHADES.map((level) => (
            <span key={level} className={cn('inline-block size-[11px] rounded-[3px]', LEVEL_CLASS[level])} />
          ))}
          <span>More</span>
        </span>
      }
    >
      <div className="flex gap-2 self-start text-muted-foreground">
        <div
          className="mt-[17px] grid grid-rows-[repeat(7,13px)] gap-y-[3px] sm:grid-rows-[repeat(7,17px)]"
          aria-hidden="true"
        >
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((name, index) => (
            <span key={index} className="text-[11px] leading-[13px] sm:leading-[17px]">
              {name}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-[3px]">
          <div className="flex h-[14px] gap-[3px]" aria-hidden="true">
            {calendar.months.map((month, week) => (
              <span
                key={week}
                className={cn(
                  'w-[13px] shrink-0 overflow-visible text-[11px] leading-[14px] whitespace-nowrap sm:w-[17px]',
                  week < PHONE_HIDDEN_WEEKS && 'max-sm:hidden',
                )}
              >
                {month}
              </span>
            ))}
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: a group of links, not of form fields: a fieldset is a form's. */}
          <div
            role="group"
            className="grid auto-cols-min grid-flow-col grid-rows-[repeat(7,13px)] gap-[3px] sm:grid-rows-[repeat(7,17px)]"
            aria-label="The days you were active"
            data-calendar=""
          >
            {calendar.weeks.flatMap((week, index) =>
              week.map((cell) => {
                const phone = index < PHONE_HIDDEN_WEEKS ? 'max-sm:hidden' : undefined;
                return cell.done ? (
                  <DaySquare
                    key={cell.day}
                    day={cell.done}
                    level={cell.level}
                    merged={cell.merged}
                    today={today}
                    late={index >= CALENDAR_WEEKS - 8}
                    pointed={cell.day === pointed}
                    className={phone}
                  />
                ) : (
                  <span
                    key={cell.day}
                    aria-hidden="true"
                    className={cn('block', CELL, LEVEL_CLASS[0], phone)}
                    data-day={cell.day}
                    data-level={0}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <p className="m-0 mt-auto text-sm text-muted-foreground" data-days-line={line.kind}>
        {typeof words === 'string' ? (
          words
        ) : (
          <>
            {words.before}
            <Figure count={line.kind === 'days' ? line.count : 0} />
            {words.after}
          </>
        )}
      </p>
    </Box>
  );
}

/** The two views' switch: links, so a view has its own address; the current one marked. */
export function ViewSwitch({ view }: { view: MyProgressView }) {
  return (
    <nav aria-label="What to list" className="w-full sm:w-auto">
      <ul className="m-0 grid w-full list-none grid-cols-2 gap-0.5 rounded-lg border bg-card p-0.5 sm:inline-flex sm:w-auto">
        {MY_PROGRESS_VIEWS.map((each) => (
          <li key={each.view}>
            <Link
              href={myProgressPath({ view: each.view })}
              scroll={false}
              aria-current={each.view === view ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center rounded-md px-3 py-1.5 text-center text-xs whitespace-nowrap max-sm:min-h-11 sm:py-1',
                each.view === view
                  ? 'bg-muted font-semibold text-foreground'
                  : 'font-medium text-muted-foreground hover:text-foreground',
              )}
              data-view={each.view}
            >
              {each.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The line beside the switch, and the switch: "3 courses started, 1 of them finished" on Courses. */
export function ViewHead({ view, line }: { view: MyProgressView; line: ReactNode }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-3">
      {/* The view's heading, for moving by headings: the course cards and History's days sit under it, not "Days". */}
      <h2 className="sr-only">{MY_PROGRESS_VIEWS.find((each) => each.view === view)?.label}</h2>
      <p className="m-0 text-sm text-muted-foreground max-sm:order-2" data-view-line="">
        {line}
      </p>
      <ViewSwitch view={view} />
    </div>
  );
}

/** "3 courses started, 1 of them finished". */
export function CoursesLine({ courses }: { courses: readonly LearnCourseMineCard[] }) {
  const line = coursesLineOf(courses);
  if (!line) return null;
  return (
    <>
      <Figure count={line.started} /> {line.started === 1 ? 'course' : 'courses'} started
      {line.finished !== null ? (
        <>
          , <Figure count={line.finished} /> of them finished
        </>
      ) : null}
    </>
  );
}

/** A started course: its kind and how far, its name, its bar and depths, what is due, then its next lesson or "Finished". */
export function MyCourseCard({ mine, today }: { mine: LearnCourseMineCard; today: string }) {
  const { course } = mine;
  // No "0 of 86 learned": a course with lessons marked as known only says so in its legend.
  const standing = mine.learned > 0 ? courseCardStandingOf(mine, course.lessons) : null;
  const bar = courseBarOf(mine, course.lessons);
  const finished = mine.finishedAt ? finishedWordsOf(mine.finishedAt, today) : null;
  const legend = [
    mine.practised > 0 ? { kind: 'practised' as const, words: `${countWords(mine.practised)} practised` } : null,
    mine.mastered > 0 ? { kind: 'mastered' as const, words: `${countWords(mine.mastered)} mastered` } : null,
    mine.known > 0 ? { kind: 'known' as const, words: `${countWords(mine.known)} marked as known` } : null,
  ].filter((each) => each !== null);
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5" data-my-course={course.slug}>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-foreground">
          {COURSE_KIND_LABELS[course.kind]}
        </span>
        {standing?.learned ? (
          <span className="text-sm whitespace-nowrap text-muted-foreground" data-course-standing="">
            {standing.all ? 'All ' : null}
            <Figure count={standing.learned.count ?? 0} />
            {standing.learned.words}
          </span>
        ) : null}
      </div>
      <h3 className="m-0 text-lg font-semibold">
        <Link href={coursePath(course.slug)} className="hover:underline">
          {course.name}
        </Link>
      </h3>
      <span
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={courseBarLabelOf(mine, course.lessons)}
      >
        {bar.map((part) => (
          <span key={part.kind} className={DEPTH_CLASS[part.kind]} style={{ width: `${part.share}%` }} />
        ))}
      </span>
      <div className="flex min-h-[22px] flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {legend.map((each) => (
          <span key={each.kind} className="inline-flex items-center gap-1.5">
            <Swatch kind={each.kind} size={10} />
            <span>{each.words}</span>
          </span>
        ))}
        {mine.due > 0 ? (
          <Link
            href={learnReviewPath(course.slug)}
            className="rounded-full border border-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-foreground hover:bg-accent"
            data-course-due=""
          >
            {countWords(mine.due)} due now
            <span className="sr-only"> in the review</span>
          </Link>
        ) : null}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        {finished ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-positive" data-course-finished="">
            <Check className="size-4" aria-hidden="true" />
            {finished}
          </span>
        ) : mine.next ? (
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">Next lesson</span>
            <Link href={learnLessonPath(mine.next.slug)} className="truncate text-sm font-medium hover:underline">
              {mine.next.title}
            </Link>
          </span>
        ) : (
          <span />
        )}
        <Button asChild variant="outline" size="sm" className="shrink-0 max-sm:min-h-11">
          <Link href={coursePath(course.slug)}>
            Open course<span className="sr-only">: {course.name}</span>
          </Link>
        </Button>
      </div>
    </li>
  );
}

/** The view Courses: a card for each course started, in the order they were started. */
export function CoursesList({ courses, today }: { courses: readonly LearnCourseMineCard[]; today: string }) {
  if (!courses.length) return null;
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3" data-my-courses="">
      {courses.map((mine) => (
        <MyCourseCard key={mine.course.slug} mine={mine} today={today} />
      ))}
    </ul>
  );
}

/** Lessons as links, " · " between them. */
function LessonLinks({ links }: { links: readonly LearnLessonLink[] }) {
  return (
    <span className="text-sm text-muted-foreground">
      {links.map((link, index) => (
        <span key={link.slug}>
          {index > 0 ? ' · ' : null}
          <Link href={learnLessonPath(link.slug)} className="font-medium text-foreground hover:underline">
            {link.title}
          </Link>
        </span>
      ))}
    </span>
  );
}

/** What a line of a day says: what was done, then the lessons or the fix it names. */
function HistoryWords({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === 'fix') {
    const { fix } = entry;
    return (
      <>
        <span className="text-sm text-foreground">
          <Link href={myFixPagePath(fix)} className="font-semibold text-link hover:underline">
            {fix.title}
          </Link>{' '}
          was merged
        </span>
        {fix.lesson ? (
          <span className="text-sm text-muted-foreground">
            <Link href={learnLessonPath(fix.lesson.slug)} className="font-medium text-foreground hover:underline">
              {fix.lesson.title}
            </Link>{' '}
            is Mastered now.
          </span>
        ) : null}
      </>
    );
  }
  if (entry.kind === 'walkthrough') {
    const { walkthrough } = entry;
    return (
      <>
        <span className="text-sm text-foreground">
          Passed the walkthrough of {walkthrough.mine ? 'your fix ' : null}
          <Link href={dayWalkthroughHrefOf(walkthrough)} className="font-semibold text-link hover:underline">
            {walkthrough.title}
          </Link>
        </span>
        <span className="text-sm text-muted-foreground">
          {walkthrough.mine ? `${walkthrough.repo}.` : `${walkthrough.repo}, a fix by ${walkthrough.fixer}.`}
        </span>
      </>
    );
  }
  return (
    <>
      <span className="text-sm text-foreground">
        {entry.kind === 'review' ? 'Repeated' : 'Learned'} <Figure count={entry.count} /> {entry.words}
      </span>
      {entry.links.length ? <LessonLinks links={entry.links} /> : null}
    </>
  );
}

/** One line of a day: its label on the left, a dot on the day's thread (filled for a merged fix), and its words. */
function HistoryLine({ entry, last }: { entry: HistoryEntry; last: boolean }) {
  return (
    <li
      className="grid grid-cols-[5rem_1rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[6rem_1rem_minmax(0,1fr)]"
      data-entry={entry.kind}
    >
      <span className="pt-[3px] text-right text-xs font-medium text-muted-foreground">{entry.label}</span>
      <span className="relative flex justify-center" aria-hidden="true">
        {!last ? <span className="absolute top-2.5 bottom-0 w-0.5 bg-border" /> : null}
        <span
          className={cn(
            'relative mt-1 size-3 rounded-full border-2',
            entry.kind === 'fix' ? 'border-primary bg-primary' : 'border-muted-foreground bg-background',
          )}
        />
      </span>
      <span className={cn('flex min-w-0 flex-col gap-0.5', !last && 'pb-[18px]')}>
        <HistoryWords entry={entry} />
      </span>
    </li>
  );
}

/** One day of History: its date, then its lines. Its id is what a square of "Days" links to. */
export function HistoryDay({
  day,
  today,
  titleRef,
}: {
  day: LearnDay;
  today: string;
  /** The day's title, which takes the focus when it is the day a square opened, or the first of a page added. */
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const entries = historyEntriesOf(day);
  if (!entries.length) return null;
  return (
    <section className="flex scroll-mt-24 flex-col gap-3" id={historyDayId(day.day)} data-history-day={day.day}>
      <h3 ref={titleRef} tabIndex={-1} className="m-0 text-sm font-semibold text-foreground outline-none">
        {dayTitleOf(day.day, today)}
      </h3>
      <ol className="m-0 flex list-none flex-col p-0">
        {entries.map((entry, index) => (
          <HistoryLine key={entry.key} entry={entry} last={index === entries.length - 1} />
        ))}
      </ol>
    </section>
  );
}

/** What History's list ends with: a way to earlier days, the wait for them, or a page of them that did not come. */
export type HistoryMore = 'more' | 'loading' | 'failed' | 'end';

/**
 * History: one group a day, newest first, in one box; "Show earlier days" adds the next twenty in place. Opened at a day
 * (a square of "Days"), the newer days are one link away.
 */
export function HistoryList({
  days,
  today,
  more,
  from = null,
  onMore,
  dayRef,
}: {
  days: readonly LearnDay[];
  today: string;
  more: HistoryMore;
  /** The day History was opened at, if any. */
  from?: string | null;
  onMore: () => void;
  /** The ref of the day that takes the focus, by its date. */
  dayRef?: { day: string; ref: Ref<HTMLHeadingElement> } | null;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-5" data-history="">
      {from ? (
        <Link
          href={myProgressPath({ view: 'history' })}
          scroll={false}
          className="self-start text-sm font-semibold text-link hover:underline"
        >
          Show the newest days
        </Link>
      ) : null}
      {!days.length && more === 'end' ? (
        <p className="m-0 text-sm text-muted-foreground" data-history-none="">
          The days you are active show here.
        </p>
      ) : null}
      {days.map((day) => (
        <HistoryDay key={day.day} day={day} today={today} titleRef={dayRef?.day === day.day ? dayRef.ref : undefined} />
      ))}
      <div role="status" className="flex flex-wrap items-center gap-3 empty:hidden">
        {more === 'failed' ? <p className="m-0 text-sm text-muted-foreground">The earlier days did not load.</p> : null}
        {more === 'more' || more === 'loading' || more === 'failed' ? (
          <Button
            type="button"
            variant="outline"
            className="max-sm:min-h-11"
            onClick={onMore}
            disabled={more === 'loading'}
            aria-busy={more === 'loading' || undefined}
            data-history-more={more}
          >
            {more === 'failed' ? 'Try again' : more === 'loading' ? 'Loading earlier days…' : 'Show earlier days'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** History while its first page is on its way: the box at its size, nothing in it yet. */
export function HistoryPending() {
  return (
    <div className="flex min-h-64 flex-col gap-6 rounded-xl border bg-card p-5" aria-busy="true" data-history="pending">
      <span className="sr-only" role="status">
        Loading your days…
      </span>
    </div>
  );
}

/** History's first page did not come: a line, and the way to ask again. */
export function HistoryFailed({ onReload }: { onReload: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5" data-history="failed">
      <p className="m-0 text-sm text-muted-foreground" role="status">
        Your days did not load. Nothing is lost; try again in a minute.
      </p>
      <Button type="button" variant="outline" className="max-sm:min-h-11" onClick={onReload}>
        Try again
      </Button>
    </div>
  );
}

/** A page with nothing to list: its title, a line, and its one way on, in a dashed box. */
export function ProgressMessage({
  state,
  title,
  text,
  titleRef,
  children,
}: {
  state: string;
  title: string;
  text: string;
  titleRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6" data-my-progress={state}>
      <h1 ref={titleRef} tabIndex={-1} className="m-0 text-lg font-semibold outline-none">
        {title}
      </h1>
      <p className="m-0 max-w-[64ch] text-sm text-muted-foreground">{text}</p>
      {children}
    </section>
  );
}

/** A visitor, or a session that ended while the page was up: progress is the person's own, so the way in is to sign in. */
export function ProgressVisitor({
  ended = false,
  titleRef,
  onSignIn,
}: {
  ended?: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
  onSignIn: () => void;
}) {
  return (
    <ProgressMessage
      state={ended ? 'ended' : 'visitor'}
      titleRef={titleRef}
      title={ended ? 'Sign in again to see your progress' : 'Your progress needs an account'}
      text={
        ended
          ? 'Your session ended. Sign in, and you come back here.'
          : 'Without an account nothing is saved, so there is nothing to show here.'
      }
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onSignIn}>
        Sign in with GitHub
      </Button>
    </ProgressMessage>
  );
}

/** Signed in, nothing learned and nothing marked: no boxes and no switch, one way on. */
export function ProgressEmpty({ titleRef }: { titleRef?: Ref<HTMLHeadingElement> }) {
  return (
    <ProgressMessage
      state="empty"
      titleRef={titleRef}
      title="Your progress starts with your first lesson"
      text="This page counts the lessons you learn, shows how well they stay, and lists your fixes."
    >
      <Button asChild size="lg" className="min-h-11 font-semibold">
        <Link href={LEARN_COURSES_PATH}>Pick your first course</Link>
      </Button>
    </ProgressMessage>
  );
}

/** A session whose progress did not come: nothing is lost, and the way to read it again. */
export function ProgressFailed({ titleRef, onReload }: { titleRef?: Ref<HTMLHeadingElement>; onReload: () => void }) {
  return (
    <ProgressMessage
      state="failed"
      titleRef={titleRef}
      title="Your progress did not load"
      text="Nothing is lost; we could not read it just now. Try again in a minute."
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onReload}>
        Try again
      </Button>
    </ProgressMessage>
  );
}

/** The two boxes while the person's progress is on its way: their places at their size, empty. */
export function ProgressPending() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-busy="true" data-my-progress="pending">
      <span className="sr-only" role="status">
        Loading your progress…
      </span>
      <Box id="my-progress-lessons" title="Lessons">
        <div className="min-h-56" />
      </Box>
      <Box id="my-progress-days" title="Days">
        <div className="min-h-56" />
      </Box>
    </div>
  );
}
