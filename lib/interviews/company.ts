import { dayWordsOf, statedByCompany } from './sources';
import type { InterviewCompanyPage, InterviewFact, InterviewPlanCard, InterviewPlanRow } from './types';

/*
 * The words of a company's page, as the approved designs write them: the line under the title, each plan's row by
 * position and level, the quiet line on the positions with no plan, the facts, and the person's plans there. Never a
 * count of nothing.
 */

/** The words of each level id, as the plans name them. */
const LEVEL_WORDS: Record<string, string> = {
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
  staff: 'Staff',
  principal: 'Principal',
};

/** Small counts in words, as the designs write them inside a sentence ("the four things"). */
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const numberWordsOf = (count: number): string => NUMBER_WORDS[count] ?? String(count);

/** "1 plan", "6 plans". */
export const countWordsOf = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/** "a", "a and b", "a, b and c" (or with "or"). */
export function joinedWithAnd(parts: readonly string[], last = 'and'): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} ${last} ${parts[parts.length - 1]}`;
}

/** Words inside a sentence: the first letter small when the first word is a plain word ("Senior"), not "iOS" or "SRE". */
const inSentence = (words: string): string =>
  /^\p{Lu}(?:\p{Ll}|\s|$)/u.test(words) ? words[0].toLocaleLowerCase('en-US') + words.slice(1) : words;

/**
 * A plan's level, as its row says it: "All levels" for a position's one plan (its slug is the position's), else the
 * level words joined ("Senior", "Mid level and senior").
 */
export function planLevelWordsOf(plan: Pick<InterviewPlanCard, 'slug' | 'position' | 'levels'>): string {
  if (plan.slug === plan.position.slug || !plan.levels.length) return 'All levels';
  const words = plan.levels.map((level) => LEVEL_WORDS[level] ?? level);
  return joinedWithAnd([words[0], ...words.slice(1).map(inSentence)]);
}

/** The company's own names for a plan's levels ("L4 and L5"); null when the sources give none. */
export const planLevelNamesOf = (plan: Pick<InterviewPlanCard, 'levelNames'>): string | null =>
  plan.levelNames.length ? joinedWithAnd(plan.levelNames) : null;

/** A plan's size, as its row says it: "5 rounds", "111 lessons", "3 projects", with no count of nothing. */
export function planSizeOf(plan: Pick<InterviewPlanCard, 'roundCount' | 'lessons' | 'projects'>): string[] {
  return [
    plan.roundCount > 0 ? countWordsOf(plan.roundCount, 'round') : null,
    plan.lessons > 0 ? countWordsOf(plan.lessons, 'lesson') : null,
    plan.projects > 0 ? countWordsOf(plan.projects, 'project') : null,
  ].filter((part): part is string => part !== null);
}

/** Every plan of the page, by position and then by level. */
export const planCardsOf = (page: Pick<InterviewCompanyPage, 'positions'>): InterviewPlanCard[] =>
  page.positions.flatMap((one) => one.plans);

/** The line under the title: "6 plans", "3 positions", "last checked 26 Nov 2026". */
export function companyCountsOf(page: Pick<InterviewCompanyPage, 'positions' | 'checkedAt'>): string[] {
  const plans = planCardsOf(page).length;
  const positions = page.positions.filter((one) => one.plans.length > 0).length;
  const checked = dayWordsOf(page.checkedAt);
  return [
    plans > 0 ? countWordsOf(plans, 'plan') : null,
    positions > 0 ? countWordsOf(positions, 'position') : null,
    checked ? `last checked ${checked}` : null,
  ].filter((part): part is string => part !== null);
}

/** The notice every page of a company carries. */
export const notOfficialWordsOf = (company: string): string =>
  `Not an official ${company} page. Built from public sources.`;

/**
 * The positions with no plan, as the quiet line names them: "frontend, machine learning or data engineer" for
 * "Frontend engineer", "Machine learning engineer" and "Data engineer" (a last word they all end with is said once).
 */
export function leftOutWordsOf(positions: readonly string[]): string | null {
  const names = positions.map((one) => one.trim()).filter(Boolean);
  if (!names.length) return null;
  const words = names.map((name) => name.split(/\s+/));
  const last = words[0][words[0].length - 1];
  const shared = names.length > 1 && words.every((one) => one.length > 1 && one[one.length - 1] === last);
  const parts = words.map((one, index) =>
    inSentence(shared && index < words.length - 1 ? one.slice(0, -1).join(' ') : one.join(' ')),
  );
  return joinedWithAnd(parts, 'or');
}

/**
 * The quiet line under the plans: that one plan covers levels the sources do not tell apart (a plan of several levels,
 * named by them, with no names of the company's own for them; 'All levels' says it already), and which positions have
 * no plan and why. Null with neither.
 */
export function plansNoteOf(page: Pick<InterviewCompanyPage, 'company' | 'positions' | 'leftOut'>): string | null {
  const shared = planCardsOf(page).filter(
    (plan) => plan.slug !== plan.position.slug && plan.levels.length > 1 && !plan.levelNames.length,
  );
  const leftOut = leftOutWordsOf(page.leftOut);
  const together = !shared.length
    ? null
    : shared.every((plan) => plan.levels.length === 2)
      ? 'Where sources do not tell two levels apart, one plan covers both.'
      : 'Where sources do not tell levels apart, one plan covers them.';
  if (together && leftOut) return `${together} No plan for ${leftOut} yet.`;
  if (together) return together;
  if (leftOut) {
    return `No plan for ${leftOut} yet: public sources do not describe those interviews at ${page.company.name} well enough.`;
  }
  return null;
}

/** A fact's words under its heading: its value, then its note, as one text. */
export function factWordsOf(fact: Pick<InterviewFact, 'value' | 'note'>): string | null {
  const value = fact.value?.trim();
  const note = fact.note?.trim();
  if (value && note) return `${/[.!?:]$/.test(value) ? value : `${value}.`} ${note}`;
  return value || note || null;
}

/**
 * The line under "What <Company> looks for": how many of its values candidates report, and how many the company
 * states itself ("The four things candidates say every interviewer rates, and one thing Google states itself.").
 */
export function valuesLineOf(values: readonly Pick<InterviewFact, 'basis'>[], company: string): string | null {
  const stated = values.filter((value) => statedByCompany(value.basis)).length;
  const reported = values.length - stated;
  const reportedWords =
    reported === 1 ? 'One thing candidates say' : `The ${numberWordsOf(reported)} things candidates say`;
  if (reported && stated) {
    const statedWords = stated === 1 ? 'one thing' : `${numberWordsOf(stated)} things`;
    return `${reportedWords} every interviewer rates, and ${statedWords} ${company} states itself.`;
  }
  if (reported) return `${reportedWords} every interviewer rates.`;
  if (stated) {
    return stated === 1
      ? `One thing ${company} states it looks for.`
      : `The ${numberWordsOf(stated)} things ${company} states it looks for.`;
  }
  return null;
}

/** The line on what the sources disagree on: "Sources disagree on 11 points, for example ..."; null with none. */
export function disagreementsWordsOf(disagreements: InterviewCompanyPage['disagreements']): string | null {
  if (!disagreements || !(disagreements.count >= 1)) return null;
  const example = disagreements.example?.trim().replace(/[.!?]+$/, '');
  if (!example) return null;
  return disagreements.count === 1
    ? `Sources disagree on one point: ${example}.`
    : `Sources disagree on ${disagreements.count} points, for example ${example}.`;
}

/** The door to the company's own course: "A course of 14 lessons on how Google hires and what it looks for". */
export function courseLineOf(
  course: NonNullable<InterviewCompanyPage['course']>,
  company: string,
  values: boolean,
): string {
  const size = course.lessons > 0 ? `A course of ${countWordsOf(course.lessons, 'lesson')}` : 'A course';
  return `${size} on how ${company} hires${values ? ' and what it looks for' : ''}`;
}

/** The line under "Courses for <Company>'s interviews": "5 courses in Learn that its plans use."; null with none. */
export const coursesLineOf = (courses: number): string | null =>
  courses > 0 ? `${countWordsOf(courses, 'course')} in Learn that its plans use.` : null;

/** The foot line's first part: "Facts from 21 public sources, written in our own words". */
export const factsFromWordsOf = (sources: number): string =>
  sources > 0
    ? `Facts from ${countWordsOf(sources, 'public source')}, written in our own words`
    : 'Facts written in our own words';

/**
 * The person's plans in progress at this company, the one worked on last first, from their read of
 * `/api/me/interviews/home`. Anything that is not such a read is none.
 */
export function myPlansAtOf(home: unknown, company: string): InterviewPlanRow[] {
  const plans = (home as { plans?: unknown } | null | undefined)?.plans;
  if (!Array.isArray(plans)) return [];
  return plans.filter(
    (row): row is InterviewPlanRow =>
      !!row &&
      typeof row === 'object' &&
      row.state === 'in_progress' &&
      row.plan?.company?.slug === company &&
      typeof row.plan.slug === 'string' &&
      typeof row.plan.name === 'string' &&
      typeof row.plan.roundCount === 'number' &&
      Array.isArray(row.rounds),
  );
}

/** A round's mark in the box: passed, the one the person is in ("You are here"), or still to come. */
export type RoundMark = 'done' | 'here' | 'ahead';

/**
 * The plan's rounds as marks, in order: the round "You are here" points to, then every round passed (out of order
 * too: nothing is locked), and the rest still to come.
 */
export const roundMarksOf = (row: Pick<InterviewPlanRow, 'rounds' | 'here'>): RoundMark[] =>
  row.rounds.map((round, index) => (index + 1 === row.here ? 'here' : round.state === 'done' ? 'done' : 'ahead'));

/** Where the person stands in a plan, as its mark says it: "round 3 of 5"; null when the read gives no round. */
export function roundOfWordsOf(row: Pick<InterviewPlanRow, 'here' | 'plan'>): string | null {
  const of = row.plan.roundCount;
  return typeof row.here === 'number' && row.here > 0 && of >= row.here ? `round ${row.here} of ${of}` : null;
}
