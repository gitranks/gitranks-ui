import type { Route } from 'next';

import { interviewPlanPath } from './paths';
import type { InterviewCompanyRef, InterviewPlanRow, InterviewsMine } from './types';

/*
 * My interviews, as its page draws it: every plan of the person, one row each. The plans in progress first, the one
 * worked on last on top, then the finished ones, finished last first. A part with nothing in it is not shown, and no
 * count of nothing is written. A stopped plan is not in the answer, so it is shown nowhere.
 */

/** One round of a plan in progress, as its mark draws it: done, the one the person is on, or one to come. */
export type MineMark = 'done' | 'current' | 'to_come';

/** One plan, as its row reads. The whole row is the link to the plan's page. */
export type MineRowView = {
  /** The plan's address, which also keys the row. */
  href: Route;
  company: InterviewCompanyRef;
  /** "Northwind · Senior software engineer". */
  title: string;
  /** The parts of the line under the name, joined with a dot. */
  line: string[];
  /** A plan in progress: one mark a round. A finished plan has none: its row says "Done". */
  marks: MineMark[] | null;
};

/** My interviews as the page draws it: each part only when it has a row. */
export type MineView = { inProgress: MineRowView[]; finished: MineRowView[] };

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Whether a row from the API has what its row draws: a company and a plan with their slugs and names, and rounds. */
function isPlanRow(value: unknown): value is InterviewPlanRow {
  if (!isObject(value) || !isObject(value.plan) || !Array.isArray(value.rounds)) return false;
  const { plan } = value;
  return (
    isText(plan.slug) &&
    isText(plan.name) &&
    isObject(plan.company) &&
    isText(plan.company.slug) &&
    isText(plan.company.name)
  );
}

/** The person's plans from their route's answer: null for an answer that is not one, and a malformed row left out. */
export function interviewsMineOf(value: unknown): InterviewsMine | null {
  if (!isObject(value) || !Array.isArray(value.inProgress) || !Array.isArray(value.finished)) return null;
  return {
    inProgress: value.inProgress.filter(isPlanRow),
    finished: value.finished.filter(isPlanRow),
  };
}

/** Whether the person has no plan to list: no plan in progress and none finished. */
export const isEmptyMine = (mine: InterviewsMine): boolean => !mine.inProgress.length && !mine.finished.length;

/** A time as a number to order by; a time that cannot be read sorts last. */
const timeOf = (value: string | null | undefined): number => {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

/** Newest first, by `at`; rows with the same time keep the API's order. */
const newestFirst = (rows: readonly InterviewPlanRow[], at: (row: InterviewPlanRow) => string | null) =>
  rows
    .map((row, index) => ({ row, index, time: timeOf(at(row)) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ row }) => row);

/** How many rounds a plan has: its marks, or the plan's own count when the row has none. */
const roundsIn = (row: InterviewPlanRow): number => row.rounds.length || row.plan.roundCount || 0;

const lessonsWords = (count: number) => `${count} ${count === 1 ? 'lesson' : 'lessons'}`;

/**
 * The line of a plan in progress: where the person stands ("Round 3 of 5", or "Round 3 of 5 is done" right after
 * it), then what comes next ("Next: Graphs, 11 lessons"). A part the API does not know is left out.
 */
export function progressLineOf(row: InterviewPlanRow): string[] {
  const rounds = roundsIn(row);
  const line: string[] = [];
  if (rounds > 0 && row.justDone && row.justDone > 0) line.push(`Round ${row.justDone} of ${rounds} is done`);
  else if (rounds > 0 && row.here && row.here > 0) line.push(`Round ${row.here} of ${rounds}`);
  if (row.next && isText(row.next.itemName)) {
    line.push(
      row.next.lessons > 0
        ? `Next: ${row.next.itemName}, ${lessonsWords(row.next.lessons)}`
        : `Next: ${row.next.itemName}`,
    );
  }
  return line;
}

/** The marks of a plan in progress: a round done, the round the person is on, the rounds to come. */
export function marksOf(row: InterviewPlanRow): MineMark[] {
  return row.rounds.map((round, index) => {
    if (round.state === 'done') return 'done';
    return index + 1 === row.here ? 'current' : 'to_come';
  });
}

/** The words for a month, as the pages write a day. */
const MONTH_WORDS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A day's year, month and day in a time zone (the browser's own when none is given); null for a time not read. */
function dayPartsOf(value: string, timeZone?: string): { year: number; month: number; day: number } | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    }).formatToParts(new Date(time));
    const part = (type: string) => Number(parts.find((one) => one.type === type)?.value);
    return { year: part('year'), month: part('month'), day: part('day') };
  } catch {
    return null;
  }
}

/** The day a plan was finished, as its row says it: "12 Nov", with the year when it is not this year's. */
export function finishedDayOf(finishedAt: string | null, now: Date, timeZone?: string): string | null {
  const day = finishedAt ? dayPartsOf(finishedAt, timeZone) : null;
  const today = dayPartsOf(now.toISOString(), timeZone);
  if (!day || !today) return null;
  const words = `${day.day} ${MONTH_WORDS[day.month - 1]}`;
  return day.year === today.year ? words : `${words} ${day.year}`;
}

/** The line of a finished plan: "All 5 rounds done", then "finished 12 Nov". */
export function finishedLineOf(row: InterviewPlanRow, now: Date, timeZone?: string): string[] {
  const rounds = roundsIn(row);
  const line: string[] = [];
  if (rounds === 1) line.push('1 round done');
  else if (rounds > 1) line.push(`All ${rounds} rounds done`);
  const day = finishedDayOf(row.finishedAt, now, timeZone);
  if (day) line.push(line.length ? `finished ${day}` : `Finished ${day}`);
  return line;
}

const titleOf = (row: InterviewPlanRow) => `${row.plan.company.name} · ${row.plan.name}`;
const hrefOf = (row: InterviewPlanRow) => interviewPlanPath(row.plan.company.slug, row.plan.slug);

/**
 * My interviews as its page draws it: the plans in progress, worked on last first, each with its line and marks;
 * then the finished ones, finished last first, each with its day. Each list is in this order whatever order the API
 * answered in.
 */
export function mineViewOf(mine: InterviewsMine, now: Date, timeZone?: string): MineView {
  return {
    inProgress: newestFirst(mine.inProgress, (row) => row.workedAt).map((row) => ({
      href: hrefOf(row),
      company: row.plan.company,
      title: titleOf(row),
      line: progressLineOf(row),
      marks: marksOf(row),
    })),
    finished: newestFirst(mine.finished, (row) => row.finishedAt ?? row.workedAt).map((row) => ({
      href: hrefOf(row),
      company: row.plan.company,
      title: titleOf(row),
      line: finishedLineOf(row, now, timeZone),
      marks: null,
    })),
  };
}
