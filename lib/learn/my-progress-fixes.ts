import type { Route } from 'next';

import { countWords } from './course';
import { ISSUES_VIEW, issuesHrefOf, type LearnIssueLesson } from './issues';
import { learnDayOfDate, shortDayWords } from './my-progress';
import { fromLearn, learnFixPath, learnFixWalkthroughPath } from './paths';
import { pullRequestPath } from '@/lib/workspace/paths';

/*
 * My progress's views of real fixes (page 18): "Your fixes", every pull request of the person's that Learn opened, and
 * "Walkthroughs", the walkthroughs of other people's fixes they passed; and what a day of History and of the calendar
 * gains from them. The rules the page draws, pure. Every answer is read tolerantly: a row the page cannot draw is left
 * out.
 */

/* ------------------------------------------------------------------------------------------------------------------ */
/* What the API answers                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A fix's pull request. */
export type MyFixState = 'OPEN' | 'MERGED' | 'CLOSED';

/** One of the person's fixes with its pull request open, merged or closed, as "Your fixes" lists it. */
export type MyFixRow = {
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  /** The pull request's number. */
  number: number;
  title: string;
  state: MyFixState;
  /** The lesson the fix confirmed; before the pull request was sent, the one its issue is linked to. */
  lesson: LearnIssueLesson | null;
  /** Whether this fix made its lesson Mastered. */
  mastered: boolean;
  /** Other people who passed its walkthrough; null for none. */
  readers: number | null;
  /** When it last moved: merged, closed or opened. */
  at: string;
};

/** Another person's fix whose walkthrough the person passed. */
export type MyWalkthroughRow = {
  repo: string;
  issueNumber: number;
  number: number;
  title: string;
  /** The fixer's login. */
  fixer: string;
  lesson: LearnIssueLesson | null;
  /** When the person first passed it. */
  passedAt: string;
};

/** One of the person's fixes merged on a day. */
export type LearnDayFix = {
  repo: string;
  issueNumber: number;
  number: number;
  title: string;
  lesson: LearnIssueLesson | null;
};

/** A walkthrough passed on a day: of another person's fix, or of their own (`mine`, maybe before it is sent). */
export type LearnDayWalkthrough = {
  repo: string;
  issueNumber: number;
  /** The pull request's number; null for their own fix before it is sent. */
  number: number | null;
  title: string;
  fixer: string;
  lesson: LearnIssueLesson | null;
  mine: boolean;
};

/** What a day of My progress gains from real fixes: the fixes merged, and the walkthroughs passed. */
export type LearnDayFixes = { fixesMerged: LearnDayFix[]; walkthroughs: LearnDayWalkthrough[] };

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const numberOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
const isRepo = (value: string | null): value is string => !!value && /^[^/\s]+\/[^/\s]+$/.test(value);
const isDate = (value: string | null): value is string => !!value && !Number.isNaN(new Date(value).getTime());

function lessonOf(value: unknown): LearnIssueLesson | null {
  const raw = recordOf(value);
  const slug = textOf(raw?.slug);
  const title = textOf(raw?.title);
  if (!slug || !title) return null;
  return { slug, title, course: textOf(raw?.course) ?? '', courseName: textOf(raw?.courseName) ?? '' };
}

const listOf = <T>(value: unknown, rowOf: (each: unknown) => T | null): T[] | null =>
  Array.isArray(value) ? value.map(rowOf).filter((row): row is T => row !== null) : null;

const STATES: readonly MyFixState[] = ['OPEN', 'MERGED', 'CLOSED'];

/** A fix of "Your fixes"; null for one with no pull request yet (it is under way, not listed) or of another shape. */
export function myFixRowOf(value: unknown): MyFixRow | null {
  const raw = recordOf(value);
  const repo = textOf(raw?.repo);
  const issueNumber = numberOf(raw?.issueNumber);
  const number = numberOf(raw?.number);
  const title = textOf(raw?.title);
  const at = textOf(raw?.at);
  const state = STATES.find((each) => each === raw?.state) ?? null;
  if (!raw || !isRepo(repo) || !issueNumber || !number || !title || !state || !isDate(at)) return null;
  return {
    repo,
    issueNumber,
    number,
    title,
    state,
    lesson: lessonOf(raw.lesson),
    mastered: raw.mastered === true,
    readers: numberOf(raw.readers),
    at,
  };
}

/** The person's fixes as "Your fixes" lists them, newest first as the API answers; null when it answered none. */
export const myFixesOf = (value: unknown): MyFixRow[] | null => listOf(value, myFixRowOf);

/** A walkthrough of "Walkthroughs"; null for one the page cannot draw. */
export function myWalkthroughRowOf(value: unknown): MyWalkthroughRow | null {
  const raw = recordOf(value);
  const fix = recordOf(raw?.fix);
  const repo = textOf(fix?.repo);
  const issueNumber = numberOf(fix?.issueNumber);
  const number = numberOf(fix?.number);
  const title = textOf(fix?.title);
  const fixer = textOf(fix?.fixer);
  const passedAt = textOf(raw?.passedAt);
  if (!fix || !isRepo(repo) || !issueNumber || !number || !title || !fixer || !isDate(passedAt)) return null;
  return { repo, issueNumber, number, title, fixer, lesson: lessonOf(fix.lesson), passedAt };
}

/** The walkthroughs the person passed, newest first; null when the API answered none. */
export function myWalkthroughsOf(value: unknown): MyWalkthroughRow[] | null {
  const rows = listOf(value, myWalkthroughRowOf);
  return rows && [...rows].sort((a, b) => Date.parse(b.passedAt) - Date.parse(a.passedAt));
}

function dayFixOf(value: unknown): LearnDayFix | null {
  const raw = recordOf(value);
  const repo = textOf(raw?.repo);
  const issueNumber = numberOf(raw?.issueNumber);
  const number = numberOf(raw?.number);
  const title = textOf(raw?.title);
  if (!raw || !isRepo(repo) || !issueNumber || !number || !title) return null;
  return { repo, issueNumber, number, title, lesson: lessonOf(raw.lesson) };
}

function dayWalkthroughOf(value: unknown): LearnDayWalkthrough | null {
  const raw = recordOf(value);
  const repo = textOf(raw?.repo);
  const issueNumber = numberOf(raw?.issueNumber);
  const title = textOf(raw?.title);
  const fixer = textOf(raw?.fixer);
  const mine = raw?.mine === true;
  const number = numberOf(raw?.number);
  // Another person's fix is listed once its pull request is open: its page is where the row leads.
  if (!raw || !isRepo(repo) || !issueNumber || !title || !fixer || (!mine && !number)) return null;
  return { repo, issueNumber, number, title, fixer, lesson: lessonOf(raw.lesson), mine };
}

/**
 * What each day gains from real fixes, by its date, from the API's days; null when it answered none. A day it answers
 * without a list keeps none.
 */
export function dayFixesOf(days: unknown): Map<string, LearnDayFixes> | null {
  if (!Array.isArray(days)) return null;
  const byDay = new Map<string, LearnDayFixes>();
  for (const each of days) {
    const raw = recordOf(each);
    const day = textOf(raw?.day);
    if (!raw || !day) continue;
    byDay.set(day, {
      fixesMerged: listOf(raw.fixesMerged, dayFixOf) ?? [],
      walkthroughs: listOf(raw.walkthroughs, dayWalkthroughOf) ?? [],
    });
  }
  return byDay;
}

/** Days with what each gains from real fixes, when it is known; the days as they were otherwise. */
export function withDayFixes<D extends { day: string }>(
  days: readonly D[],
  fixes: Map<string, LearnDayFixes> | null,
): (D & Partial<LearnDayFixes>)[] {
  if (!fixes) return [...days];
  return days.map((day) => {
    const extra = fixes.get(day.day);
    return extra ? { ...day, ...extra } : day;
  });
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Addresses                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The person's own pull request page of a fix, reached from Learn. */
export const myFixPagePath = (fix: { repo: string; issueNumber: number }): Route =>
  fromLearn(pullRequestPath({ repo: fix.repo, issue: fix.issueNumber }));

/** A fix's public page, "Learn from it". */
export const fixPagePathOf = (fix: { repo: string; number: number }): Route =>
  learnFixPath({ nameWithOwner: fix.repo, number: fix.number });

/** A fix's public walkthrough, which "Open it again" starts. */
export const fixWalkthroughPathOf = (fix: { repo: string; number: number }): Route =>
  learnFixWalkthroughPath({ nameWithOwner: fix.repo, number: fix.number });

/** GitHub's pull request of a fix. */
export const pullUrlOf = (fix: { repo: string; number: number }) => `https://github.com/${fix.repo}/pull/${fix.number}`;

/** The open issues of the person's list: Issues, as it opens. */
export const MY_ISSUES_PATH: Route = issuesHrefOf(ISSUES_VIEW);
/** The merged fixes made with Learn, each with its walkthrough. */
export const FIXED_ISSUES_PATH: Route = issuesHrefOf({ ...ISSUES_VIEW, fixed: true });

/* ------------------------------------------------------------------------------------------------------------------ */
/* Your fixes                                                                                                         */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The line beside the switch: "3 merged in 3 projects · 1 open · 1 closed", each part only when above zero. */
export type FixesLine = { merged: number; projects: number; open: number; closed: number };

export function fixesLineOf(fixes: readonly MyFixRow[]): FixesLine | null {
  if (!fixes.length) return null;
  const merged = fixes.filter((fix) => fix.state === 'MERGED');
  return {
    merged: merged.length,
    projects: new Set(merged.map((fix) => fix.repo.toLowerCase())).size,
    open: fixes.filter((fix) => fix.state === 'OPEN').length,
    closed: fixes.filter((fix) => fix.state === 'CLOSED').length,
  };
}

/** "3 people read your walkthrough"; null for none. */
export const readersWordsOf = (readers: number | null) =>
  readers ? `${countWords(readers)} ${readers === 1 ? 'person' : 'people'} read your walkthrough.` : null;

/**
 * What a fix did to a lesson, and only when it used one: "Uses" while its pull request is open, with what merging it
 * does; "Used" once merged, "It is Mastered now" only for the fix that made it so; a closed one names it alone.
 */
export type FixLessonWords = { before: string; lesson: LearnIssueLesson; after: string };

export function fixLessonWordsOf(fix: MyFixRow): FixLessonWords | null {
  if (!fix.lesson) return null;
  if (fix.state === 'OPEN') {
    return { before: 'Uses ', lesson: fix.lesson, after: '. It becomes Mastered when the fix is merged.' };
  }
  if (fix.state === 'MERGED' && fix.mastered)
    return { before: 'Used ', lesson: fix.lesson, after: '. It is Mastered now.' };
  return { before: 'Used ', lesson: fix.lesson, after: '.' };
}

/** A fix's pill: "open, in review", "merged 20 Nov", "closed 28 Oct", in the browser's day. */
export function fixPillOf(fix: Pick<MyFixRow, 'state' | 'at'>, today: string): { words: string; tone: MyFixState } {
  if (fix.state === 'OPEN') return { words: 'open, in review', tone: 'OPEN' };
  const day = shortDayWords(learnDayOfDate(new Date(fix.at)), today);
  return { words: `${fix.state === 'MERGED' ? 'merged' : 'closed'} ${day}`, tone: fix.state };
}

/** What "Your fixes" with nothing in it reads: the open issues that fit the person, and their list's email. */
export type NoFixEnd = { openIssues: number | null; email: { emailOn: boolean; emailTo: string | null } | null };

/** "Your fixes" with nothing in it: the line, and the one way on (the issues that fit, else the email for one). */
export const NO_FIX_TITLE = 'No fix of yours yet';
export const NO_FIX_LEAD = 'A merged fix of your own moves a lesson to Mastered.';

export function noFixLineOf(openIssues: number | null): string {
  if (!openIssues) return `${NO_FIX_LEAD} No open issue fits you right now.`;
  const count = openIssues > 1000 ? '1,000+' : countWords(openIssues);
  return `${NO_FIX_LEAD} ${count} open ${openIssues === 1 ? 'issue fits' : 'issues fit'} you now.`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Walkthroughs                                                                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

/** "6 walkthroughs of other people’s fixes passed". */
export const walkthroughsLineOf = (rows: readonly MyWalkthroughRow[]) =>
  rows.length
    ? {
        count: rows.length,
        words: `${rows.length === 1 ? 'walkthrough' : 'walkthroughs'} of other people’s fixes passed`,
      }
    : null;

/** "passed 21 Nov", in the browser's day. */
export const passedWordsOf = (passedAt: string, today: string) =>
  `passed ${shortDayWords(learnDayOfDate(new Date(passedAt)), today)}`;

/** "Walkthroughs" with nothing in it: what a walkthrough is, and the merged fixes that have one when there are any. */
export const NO_WALKTHROUGH_TITLE = 'No walkthrough passed yet';
export const NO_WALKTHROUGH_LEAD = 'A walkthrough is a few questions about one real fix that was merged.';

export function noWalkthroughLineOf(fixes: number | null): string {
  if (!fixes) return `${NO_WALKTHROUGH_LEAD} The first ones appear as fixes get merged.`;
  return `${NO_WALKTHROUGH_LEAD} ${countWords(fixes)} ${fixes === 1 ? 'fix has' : 'fixes have'} one.`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* A day                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Where a walkthrough's line in History leads: another person's fix's page, else the person's own pull request. */
export const dayWalkthroughHrefOf = (walkthrough: LearnDayWalkthrough): Route =>
  walkthrough.number && !walkthrough.mine
    ? fixPagePathOf({ repo: walkthrough.repo, number: walkthrough.number })
    : myFixPagePath(walkthrough);
