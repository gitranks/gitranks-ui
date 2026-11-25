import type { Route } from 'next';

import { countWords, type LearnCourseMineCard } from './course';
import type { LearnLessonLink } from './lesson-page';
import type { LearnDayFix, LearnDayFixes, LearnDayWalkthrough } from './my-progress-fixes';
import { LEARN_PROGRESS_PATH } from './paths';

/*
 * My progress: the two boxes (lessons by depth, the days something was done), and four views under them,
 * Courses, Your fixes, Walkthroughs and History. The rules the page draws, pure, so the page, the catalogue and the
 * specs agree. The fixes' own rules are in `my-progress-fixes.ts`.
 */

/**
 * One day with something done: how many lessons were learned and reviews answered, and links to them; the person's
 * fixes merged and the walkthroughs passed that day when their read answered (`my-progress-fixes.ts`).
 */
export type LearnDay = {
  /** The person's local date, `2026-11-20`. */
  day: string;
  lessons: number;
  reviews: number;
  /** The lessons learned that day that a page still shows; `lessons` counts the others too. */
  learned: LearnLessonLink[];
  /** The lessons repeated in a review that day that a page still shows. */
  repeated: LearnLessonLink[];
} & Partial<LearnDayFixes>;

/** My progress as the API answers it. `learned` counts every depth; `known`, the lessons marked and not learned. */
export type LearnMyProgress = {
  learned: number;
  practised: number;
  mastered: number;
  known: number;
  /** The days with something done in the last 26 weeks, oldest first. */
  days: LearnDay[];
  /** Every day with something done, ever. */
  activeDays: number;
  courses: LearnCourseMineCard[];
};

/** A page of History: twenty days at most, newest first, and whether earlier ones wait. */
export type LearnHistory = { days: LearnDay[]; more: boolean };

/* ------------------------------------------------------------------------------------------------------------------ */
/* The address                                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The views under the boxes. */
export type MyProgressView = 'courses' | 'fixes' | 'walkthroughs' | 'history';

export const MY_PROGRESS_VIEWS: { view: MyProgressView; label: string }[] = [
  { view: 'courses', label: 'Courses' },
  { view: 'fixes', label: 'Your fixes' },
  { view: 'walkthroughs', label: 'Walkthroughs' },
  { view: 'history', label: 'History' },
];

/** The view an address asks for, by name; Courses for anything else. */
export const myProgressViewOf = (value: unknown): MyProgressView =>
  MY_PROGRESS_VIEWS.find((each) => each.view !== 'courses' && each.view === value)?.view ?? 'courses';

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether a value is a real local date written as the API writes one, `2026-11-20`. */
export function isLearnDay(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DAY.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

/** The day an address opens History at; null for none, or for anything that is not a date. */
export const myProgressDayOf = (value: unknown): string | null => (isLearnDay(value) ? value : null);

/** My progress at a view, History opened at a day when one is given. */
export function myProgressPath({ view = 'courses', day = null }: { view?: MyProgressView; day?: string | null } = {}) {
  if (view === 'courses') return LEARN_PROGRESS_PATH;
  if (view !== 'history') return `${LEARN_PROGRESS_PATH}?view=${view}` as Route;
  return `${LEARN_PROGRESS_PATH}?view=history${day ? `&day=${day}` : ''}` as Route;
}

/** The id a day's group has in History, which a square's link scrolls to. */
export const historyDayId = (day: string) => `day-${day}`;

/* ------------------------------------------------------------------------------------------------------------------ */
/* Dates                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A date as a day: `2026-11-20`, in the browser's own day. */
export const learnDayOfDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The zone Learn counts a person's days in when they saved none, or saved one that is not a real zone. */
export const LEARN_DEFAULT_TIME_ZONE = 'America/New_York';

/**
 * Today's date as the API counts a person's days: in the zone they saved (`null`: none saved), else in Learn's default
 * zone. "Today" and "Your first day" use it, so the page and the API agree on the day.
 */
export function learnTodayIn(now: Date, timeZone: string | null): string {
  const partsIn = (zone: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = partsIn(timeZone || LEARN_DEFAULT_TIME_ZONE);
  } catch {
    parts = partsIn(LEARN_DEFAULT_TIME_ZONE);
  }
  const part = (type: string) => parts.find((each) => each.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const utcOf = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
};

/** The day `count` days after `day` (before, for a negative count). */
export function addLearnDays(day: string, count: number): string {
  const date = utcOf(day);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** Monday 0 to Sunday 6. */
const weekdayOf = (day: string) => (utcOf(day).getUTCDay() + 6) % 7;

// Fixed names, not the browser's locale: some write "Sept", the boards write "Sep".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthOf = (day: string) => MONTHS[Number(day.slice(5, 7)) - 1] ?? '';

const sameYear = (day: string, today: string) => day.slice(0, 4) === today.slice(0, 4);

/** "20 Nov"; with its year when it is not this year's. */
export function shortDayWords(day: string, today: string): string {
  const words = `${Number(day.slice(8, 10))} ${monthOf(day)}`;
  return sameYear(day, today) ? words : `${words} ${day.slice(0, 4)}`;
}

/** "Friday 20 Nov"; "Today, Sunday 22 Nov"; with its year when it is not this year's. */
export function dayTitleOf(day: string, today: string): string {
  const words = `${WEEKDAYS[weekdayOf(day)]} ${shortDayWords(day, today)}`;
  return day === today ? `Today, ${words}` : words;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The box "Lessons"                                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A row of the box: a depth, or marked as known, with its count and its bar's share of the lessons learned. */
export type DepthRow = {
  kind: 'learned' | 'practised' | 'mastered' | 'known';
  label: string;
  hint: string;
  count: number;
  share: number;
};

const DEPTH_ROWS: Omit<DepthRow, 'count' | 'share'>[] = [
  { kind: 'learned', label: 'Learned', hint: 'you passed the lesson' },
  { kind: 'practised', label: 'Practised', hint: 'right again in a review, days later' },
  { kind: 'mastered', label: 'Mastered', hint: 'right again 10 days later, or a merged fix of yours' },
];
const KNOWN_ROW: Omit<DepthRow, 'count' | 'share'> = {
  kind: 'known',
  label: 'Marked as known',
  hint: 'you said so, without answering',
};

/**
 * What the box "Lessons" shows: the lessons learned and a row for each depth with something in it, then marked as known
 * apart; with nothing learned, the lessons marked as known alone, never called learned; null with neither (the page
 * then has no boxes). A bar is its count's share of the lessons learned.
 */
export type LessonsBox =
  | { kind: 'learned'; learned: number; depths: DepthRow[]; known: DepthRow | null }
  | { kind: 'known'; known: number };

export function lessonsBoxOf(progress: Pick<LearnMyProgress, 'learned' | 'practised' | 'mastered' | 'known'>) {
  const { learned, known } = progress;
  if (learned <= 0) return known > 0 ? ({ kind: 'known', known } satisfies LessonsBox) : null;
  const shareOf = (count: number) => Math.min(100, (count / learned) * 100);
  const counts = { learned, practised: progress.practised, mastered: progress.mastered, known };
  const depths = DEPTH_ROWS.map((row) => ({ ...row, count: counts[row.kind] }))
    .filter((row) => row.count > 0)
    .map((row) => ({ ...row, share: shareOf(row.count) }));
  return {
    kind: 'learned',
    learned,
    depths,
    known: known > 0 ? { ...KNOWN_ROW, count: known, share: shareOf(known) } : null,
  } satisfies LessonsBox;
}

/** "103 lessons learned", "1 lesson learned", "37 lessons marked as known": the words after the number. */
export const lessonsBoxWords = (box: LessonsBox) =>
  box.kind === 'learned'
    ? `${box.learned === 1 ? 'lesson' : 'lessons'} learned`
    : `${box.known === 1 ? 'lesson' : 'lessons'} marked as known`;

/** The line of the box when nothing is learned yet and lessons are marked as known. */
export const KNOWN_ONLY_LINE = 'You said you know them, without answering. Answer a lesson and it counts as Learned.';

/** Whether there is nothing to show yet: nothing learned, nothing marked, no day with something done. */
export const isEmptyProgress = (progress: Pick<LearnMyProgress, 'learned' | 'known' | 'activeDays'>) =>
  progress.learned <= 0 && progress.known <= 0 && progress.activeDays <= 0;

/* ------------------------------------------------------------------------------------------------------------------ */
/* The box "Days"                                                                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

/** How many weeks the box shows: 26, and 17 on a phone (the newest ones). */
export const CALENDAR_WEEKS = 26;
export const CALENDAR_WEEKS_PHONE = 17;

/** A square's shade, from none (0) to the most (4), by the lessons learned and the reviews answered on its day. */
export type DayLevel = 0 | 1 | 2 | 3 | 4;

type DayCounts = Pick<LearnDay, 'lessons' | 'reviews' | 'fixesMerged' | 'walkthroughs'>;

/** How many things were done on a day: lessons learned, reviews answered, fixes merged and walkthroughs passed. */
const doneOf = (day: DayCounts) =>
  Math.max(0, day.lessons) +
  Math.max(0, day.reviews) +
  (day.fixesMerged?.length ?? 0) +
  (day.walkthroughs?.length ?? 0);

/**
 * The shades' lower bounds: 1 or 2 things done, 3 to 5, 6 to 9, 10 and more. A fix merged and a walkthrough passed
 * count one each.
 */
export function dayLevelOf(day: DayCounts | undefined): DayLevel {
  const done = day ? doneOf(day) : 0;
  if (done >= 10) return 4;
  if (done >= 6) return 3;
  if (done >= 3) return 2;
  return done >= 1 ? 1 : 0;
}

/**
 * One square: its day, its shade, the day's numbers when something was done, and whether a fix of the person's was
 * merged that day (a gold border).
 */
export type CalendarCell = { day: string; level: DayLevel; done: LearnDay | null; merged: boolean };

/** The squares in weeks from Monday, the newest week last and cut at today; a month's name over its first Monday. */
export type Calendar = { weeks: CalendarCell[][]; months: (string | null)[] };

/**
 * The calendar of the last 26 weeks to today: the week of today last, each week from Monday; a day after today is not
 * drawn. A day the API answers after the browser's today (another zone) moves today on to it.
 */
export function calendarOf(days: readonly LearnDay[], today: string, weeks = CALENDAR_WEEKS): Calendar {
  const byDay = new Map(days.filter((day) => isLearnDay(day.day)).map((day) => [day.day, day]));
  const last = [...byDay.keys(), today].sort().at(-1) ?? today;
  const start = addLearnDays(last, -weekdayOf(last) - 7 * (weeks - 1));
  const out: CalendarCell[][] = [];
  const months: (string | null)[] = [];
  for (let week = 0; week < weeks; week += 1) {
    const monday = addLearnDays(start, week * 7);
    months.push(Number(monday.slice(8)) <= 7 ? monthOf(monday) : null);
    const cells: CalendarCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = addLearnDays(monday, weekday);
      if (day > last) break;
      const done = byDay.get(day) ?? null;
      cells.push({ day, level: done ? dayLevelOf(done) : 0, done, merged: !!done?.fixesMerged?.length });
    }
    out.push(cells);
  }
  return { weeks: out, months };
}

/** One thing a day's card says: its words, and whether it is the merged fix (drawn with the gold mark). */
export type DayDone = { words: string; merged: boolean };

/**
 * "2 lessons learned", "6 lessons repeated", "Your fix was merged", "1 walkthrough passed": what a day's card and its
 * label say, each only when above zero.
 */
export function dayDoneOf(day: DayCounts): DayDone[] {
  const done: DayDone[] = [];
  const plain = (words: string) => done.push({ words, merged: false });
  if (day.lessons > 0) plain(`${countWords(day.lessons)} ${day.lessons === 1 ? 'lesson' : 'lessons'} learned`);
  if (day.reviews > 0) plain(`${countWords(day.reviews)} ${day.reviews === 1 ? 'lesson' : 'lessons'} repeated`);
  const merged = day.fixesMerged?.length ?? 0;
  if (merged === 1) done.push({ words: 'Your fix was merged', merged: true });
  else if (merged > 1) done.push({ words: `${countWords(merged)} fixes of yours were merged`, merged: true });
  const passed = day.walkthroughs?.length ?? 0;
  if (passed > 0) plain(`${countWords(passed)} ${passed === 1 ? 'walkthrough' : 'walkthroughs'} passed`);
  return done;
}

/** The words alone of `dayDoneOf`. */
export const dayDoneWordsOf = (day: DayCounts): string[] => dayDoneOf(day).map((each) => each.words);

/**
 * A square's label for a screen reader: "Friday 20 Nov: 2 lessons learned, 6 lessons repeated". A day active with no
 * lesson and no review (a merged fix, a walkthrough, an agent's command; the day row does not say which) is "active".
 */
export const dayLabelOf = (day: LearnDay, today: string) => {
  const words = dayDoneWordsOf(day);
  return `${dayTitleOf(day.day, today)}: ${words.length ? words.join(', ') : 'active'}`;
};

/** The line under the calendar: the days with something done, since the first one when the calendar holds it. */
export type DaysLine = { kind: 'none' } | { kind: 'first' } | { kind: 'days'; count: number; since: string | null };

export function daysLineOf(progress: Pick<LearnMyProgress, 'days' | 'activeDays'>, today: string): DaysLine {
  const count = Math.max(0, progress.activeDays);
  if (count === 0) return { kind: 'none' };
  const first = progress.days[0]?.day;
  if (count === 1 && first === today) return { kind: 'first' };
  // "Since" only when every day counted is in the calendar: an earlier one has a date the page does not know.
  return { kind: 'days', count, since: first && progress.days.length >= count ? shortDayWords(first, today) : null };
}

/** The line's words around its number. */
export function daysLineWords(line: DaysLine): { before: string; after: string } | string {
  if (line.kind === 'none') return 'The days you are active show here.';
  if (line.kind === 'first') return 'Your first day.';
  // One day with its date: "since" would read as time passing.
  if (line.count === 1 && line.since) return `You were active on ${line.since}.`;
  return {
    before: 'You were active on ',
    after: ` ${line.count === 1 ? 'day' : 'days'}${line.since ? ` since ${line.since}` : ''}.`,
  };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Courses                                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** "3 courses started, 1 of them finished"; "1 course started"; none without a course. */
export function coursesLineOf(courses: readonly Pick<LearnCourseMineCard, 'finishedAt'>[]) {
  if (!courses.length) return null;
  const finished = courses.filter((course) => course.finishedAt !== null).length;
  return { started: courses.length, finished: finished > 0 ? finished : null };
}

/** "Finished on 12 Nov": the day the course's last lesson was learned, in the browser's day. */
export function finishedWordsOf(finishedAt: string, today: string): string | null {
  const date = new Date(finishedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Finished on ${shortDayWords(learnDayOfDate(date), today)}`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* History                                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Where a History page starts: the first day of the next page, as `before` asks (the day after the one to open). */
export const historyBeforeOf = (day: string | null) => (day ? addLearnDays(day, 1) : null);

/**
 * One line of a day in History: a review or the lessons learned, with its count and the lessons a page still shows; a
 * fix of the person's that was merged; or a walkthrough passed.
 */
export type HistoryEntry =
  | { kind: 'review' | 'lessons'; key: string; label: string; count: number; words: string; links: LearnLessonLink[] }
  | { kind: 'fix'; key: string; label: string; fix: LearnDayFix }
  | { kind: 'walkthrough'; key: string; label: string; walkthrough: LearnDayWalkthrough };

/**
 * A day's lines: the fixes merged first, then the walkthroughs passed, the review and the lessons learned, as the
 * boards draw them; each only when there is one.
 */
export function historyEntriesOf(day: LearnDay): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const fix of day.fixesMerged ?? []) {
    entries.push({ kind: 'fix', key: `fix:${fix.repo}#${fix.number}`, label: 'Your fix', fix });
  }
  for (const walkthrough of day.walkthroughs ?? []) {
    const key = `walkthrough:${walkthrough.repo}#${walkthrough.issueNumber}:${walkthrough.number ?? ''}`;
    entries.push({ kind: 'walkthrough', key, label: 'Walkthrough', walkthrough });
  }
  if (day.reviews > 0) {
    entries.push({
      kind: 'review',
      key: 'review',
      label: 'Review',
      count: day.reviews,
      words: day.reviews === 1 ? 'lesson' : 'lessons',
      links: day.repeated,
    });
  }
  if (day.lessons > 0) {
    entries.push({
      kind: 'lessons',
      key: 'lessons',
      label: 'Lessons',
      count: day.lessons,
      words: day.lessons === 1 ? 'lesson' : 'lessons',
      links: day.learned,
    });
  }
  return entries;
}

/** Days of two pages as one list, newest first: a day already listed is not listed twice. */
export function historyAfter(shown: readonly LearnDay[], next: readonly LearnDay[]): LearnDay[] {
  const seen = new Set(shown.map((day) => day.day));
  return [...shown, ...next.filter((day) => !seen.has(day.day))];
}
