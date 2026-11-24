import type { Route } from 'next';

import {
  ISSUES_VIEW,
  type IssuesRow,
  issuesCountTextOf,
  issuesHrefOf,
  issuesRowOf,
  type LearnFixes,
  type LearnFixRow,
  type LearnIssueLesson,
  mergedOnOf,
} from './issues';
import { fromLearn, LEARN_ISSUES_PATH, learnLessonRealWorldPath } from './paths';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';
import { pullRequestPath } from '@/lib/workspace/paths';
import { needsYouRowWordsOf } from '@/lib/workspace/pull-request-list';
import type {
  PullRequestBox,
  PullRequestListGroup,
  PullRequestListMark,
  PullRequestListRow,
} from '@/lib/workspace/pull-request-page.types';

/*
 * Real issues where Learn's pages meet them: "In the real world" under a lesson, the third box and the "Real issues"
 * rows of Learn home, a course's third box and its "N real issues fixed", and the landing's merged fixes. Every answer
 * is read tolerantly: a part the API does not answer is left out, and the page draws what it drew before.
 */

/* ------------------------------------------------------------------------------------------------------------------ */
/* What the API answers                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A fix's pull request; null before it opens. */
export type LearnFixState = 'OPEN' | 'MERGED' | 'CLOSED';

/** One of the person's fixes made with Learn, as a lesson's personal side names it. */
export type LearnMyFix = {
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  /** The pull request's number; null before it opens. */
  number: number | null;
  title: string;
  state: LearnFixState | null;
  lesson: LearnIssueLesson | null;
  /** When it last moved: merged, closed, opened or started. */
  at: string | null;
};

/**
 * The person's newest merged fix, for Learn home's third box: answered for 7 days after its merge (the API decides),
 * and none once a newer fix of theirs is under way. `mastered`: its lesson is Mastered now.
 */
export type LearnMergedFix = LearnMyFix & { mastered: boolean };

/** What a lesson's personal side adds: the person's fix that uses it, and the first issue of their list for it. */
export type LessonReal = { fix: LearnMyFix | null; fixAnIssue: IssuesRow | null };

/**
 * What the person's route answers for "In the real world": the lesson's personal side (`real`), the masked rows of
 * their list for the lesson with what the rows need (`rows`, `reads`), and the merged fixes that used the lesson
 * (`fixes`), handed only to a person Learn is open to. Each null when it is not answered.
 */
export type LessonRealMine = {
  real: LessonReal | null;
  rows: IssuesRow[] | null;
  reads: MaskedListReads | null;
  fixes: LearnFixes | null;
};

export const NO_LESSON_REAL: LessonRealMine = { real: null, rows: null, reads: null, fixes: null };

/**
 * Where the person's fix in the third box stands: it needs them, their agent is working, its pull request is open, or
 * it was merged. Read from the row's group and mark alone.
 */
export type HomeFixState = 'needs-you' | 'working' | 'open' | 'merged';

/**
 * Learn home's third box: a fix of the person's that needs them (with the open issues a quiet line under it); else
 * their fix merged in the last 7 days; else a fix of theirs followed to its
 * end; else the open issues that fit them; else none open, with the email for a new one.
 */
export type HomeThirdBox =
  | { kind: 'fix'; row: PullRequestListRow; state: HomeFixState; openIssues: number | null }
  | { kind: 'merged'; fix: LearnMergedFix }
  | { kind: 'issues'; count: number }
  | { kind: 'none'; emailOn: boolean; emailTo: string | null };

/** What Learn home adds: the third box, the person's fixes not ended, and the five issues of their list. */
export type HomeReal = { box: HomeThirdBox | null; fixes: PullRequestListRow[]; issues: IssuesRow[] };

export const NO_HOME_REAL: HomeReal = { box: null, fixes: [], issues: [] };

/* ------------------------------------------------------------------------------------------------------------------ */
/* Answers checked                                                                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const numberOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
/** A count worth showing: more than none. */
const countOf = (value: unknown): number | null => {
  const count = numberOf(value);
  return count !== null && count > 0 ? Math.floor(count) : null;
};

function lessonOf(value: unknown): LearnIssueLesson | null {
  const raw = recordOf(value);
  const slug = textOf(raw?.slug);
  const title = textOf(raw?.title);
  if (!slug || !title) return null;
  return { slug, title, course: textOf(raw?.course) ?? '', courseName: textOf(raw?.courseName) ?? '' };
}

const FIX_STATES: readonly LearnFixState[] = ['OPEN', 'MERGED', 'CLOSED'];

/** One of the person's fixes; null when it is not one. A closed one is no fix of theirs for a lesson. */
export function myFixOf(value: unknown): LearnMyFix | null {
  const raw = recordOf(value);
  const repo = textOf(raw?.repo);
  const issueNumber = numberOf(raw?.issueNumber);
  const title = textOf(raw?.title);
  if (!raw || !repo?.includes('/') || issueNumber === null || !title) return null;
  const state = FIX_STATES.includes(raw.state as LearnFixState) ? (raw.state as LearnFixState) : null;
  if (state === 'CLOSED') return null;
  return {
    repo,
    issueNumber,
    number: numberOf(raw.number),
    title,
    state,
    lesson: lessonOf(raw.lesson),
    at: textOf(raw.at),
  };
}

/** The person's fix merged in the last 7 days, as Learn home's third box has it; null for none, or one not merged. */
export function mergedFixOf(value: unknown): LearnMergedFix | null {
  const fix = myFixOf(value);
  if (!fix || (fix.state !== null && fix.state !== 'MERGED')) return null;
  return { ...fix, mastered: recordOf(value)?.mastered === true };
}

/** A lesson's personal side as the API answers it; null when there is none (Learn not open to the person). */
export function lessonRealOf(value: unknown): LessonReal | null {
  const raw = recordOf(value);
  if (!raw) return null;
  return { fix: myFixOf(raw.fix), fixAnIssue: issuesRowOf(raw.fixAnIssue) };
}

/** Rows of the person's list; null when it is not a list (Learn not open to them). */
export function realRowsOf(value: unknown): IssuesRow[] | null {
  const raw = recordOf(value);
  if (!raw || !Array.isArray(raw.rows)) return null;
  return raw.rows.map(issuesRowOf).filter((row): row is IssuesRow => row !== null);
}

/** Merged fixes as the API answers them; null when they are not. */
export function fixesOf(value: unknown): LearnFixes | null {
  const raw = recordOf(value);
  if (!raw || !Array.isArray(raw.rows)) return null;
  const rows = raw.rows.filter((row): row is LearnFixRow => {
    const fix = recordOf(row);
    return !!fix && !!textOf(fix.repo) && numberOf(fix.number) !== null && !!textOf(fix.title);
  });
  return { rows, total: Math.max(numberOf(raw.total) ?? 0, rows.length), next: textOf(raw.next) };
}

const GROUPS: readonly PullRequestListGroup[] = ['NEEDS_YOU', 'IN_PROGRESS', 'ENDED'];
const MARKS: readonly PullRequestListMark[] = ['NEEDS_YOU', 'AGENT_WORKING', 'MAINTAINERS', 'MERGED'];

/** A row of the person's pull requests, as their list has it; null when it is not one. */
export function pullRequestRowOf(value: unknown): PullRequestListRow | null {
  const raw = recordOf(value);
  const attemptId = textOf(raw?.attemptId);
  const repo = textOf(raw?.repo);
  const issueNumber = numberOf(raw?.issueNumber);
  const title = textOf(raw?.title);
  const box = textOf(raw?.box) as PullRequestBox | null;
  const since = textOf(raw?.since);
  if (!raw || !attemptId || !repo?.includes('/') || issueNumber === null || !title || !box || !since) {
    return null;
  }
  const group = GROUPS.includes(raw.group as PullRequestListGroup) ? (raw.group as PullRequestListGroup) : null;
  if (!group) return null;
  return {
    attemptId,
    made: raw.made === 'CONTRIBUTE' ? 'CONTRIBUTE' : 'LEARN',
    repo,
    issueNumber,
    issueUrl: textOf(raw.issueUrl) ?? `https://github.com/${repo}/issues/${issueNumber}`,
    number: numberOf(raw.number),
    url: textOf(raw.url),
    title,
    group,
    box,
    round: numberOf(raw.round),
    mark: MARKS.includes(raw.mark as PullRequestListMark) ? (raw.mark as PullRequestListMark) : null,
    agent: textOf(raw.agent),
    costUsd: numberOf(raw.costUsd),
    lesson: lessonOf(raw.lesson),
    pageRemoved: raw.pageRemoved === true,
    since,
  };
}

/** The email for a new issue on the person's list, as Learn home's issues read answers it; null when it does not. */
export function homeIssuesEmailOf(issuesRead: unknown): { emailOn: boolean; emailTo: string | null } | null {
  const list = recordOf(recordOf(issuesRead)?.issues);
  if (!list || typeof list.emailOn !== 'boolean') return null;
  return { emailOn: list.emailOn, emailTo: textOf(list.emailTo) };
}

/** Where a fix stands for the third box; null for one that ended without a merge. */
export function homeFixStateOf(row: Pick<PullRequestListRow, 'group' | 'mark'>): HomeFixState | null {
  if (row.group === 'NEEDS_YOU') return 'needs-you';
  if (row.group === 'IN_PROGRESS') return row.mark === 'MAINTAINERS' ? 'open' : 'working';
  return row.mark === 'MERGED' ? 'merged' : null;
}

/**
 * Learn home's parts from its three reads: the issues' (`thirdBox.openIssues`, `issues` with its email), the fixes'
 * (`thirdBox`'s fix, `fixes`) and the merged fix's (`thirdBox.merged`). Any may be missing (null), and the home draws
 * what the others give. The box is the fix that needs the person; else their fix merged in the last 7 days; else the
 * first of their fixes the API sends (in progress, or merged when it sends one); else the count of open issues that
 * fit them; else, when the issues' read answered, none open (a box that answers nothing is that quiet box, never a
 * zero). None answered: no box, and the home is as it was. A fix row that has ended is left out of the rows.
 */
export function homeRealOf(issuesRead: unknown, fixesRead: unknown, mergedRead: unknown = null): HomeReal {
  const issuesHome = recordOf(issuesRead);
  const fixesHome = recordOf(fixesRead);
  const issuesBox = recordOf(issuesHome?.thirdBox);
  const openIssues = countOf(issuesBox?.openIssues);
  const fixBox = recordOf(fixesHome?.thirdBox);
  const allFixes = (Array.isArray(fixesHome?.fixes) ? fixesHome.fixes : [])
    .map(pullRequestRowOf)
    .filter((row): row is PullRequestListRow => row !== null);
  const needsYou =
    (fixBox?.needsYou === true ? pullRequestRowOf(fixBox.fix) : null) ??
    allFixes.find((row) => row.group === 'NEEDS_YOU') ??
    null;
  const merged = needsYou ? null : mergedFixOf(recordOf(recordOf(recordOf(mergedRead)?.thirdBox)?.merged));
  const followed =
    needsYou ??
    allFixes.find((row) => row.group === 'IN_PROGRESS') ??
    allFixes.find((row) => homeFixStateOf(row) === 'merged') ??
    null;
  const state = followed ? homeFixStateOf(followed) : null;
  const list = recordOf(issuesHome?.issues);
  const issues = realRowsOf(list) ?? [];
  let box: HomeThirdBox | null = null;
  if (merged) box = { kind: 'merged', fix: merged };
  else if (followed && state) box = { kind: 'fix', row: followed, state, openIssues };
  else if (openIssues) box = { kind: 'issues', count: openIssues };
  else if (issuesBox && list) {
    box = { kind: 'none', emailOn: list.emailOn === true, emailTo: textOf(list.emailTo) };
  }
  return { box, fixes: allFixes.filter((row) => row.group !== 'ENDED'), issues };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Addresses                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A fix's page of the person's own: their pull request's page, reached from Learn. */
export const myFixPathOf = (fix: { repo: string; issueNumber: number }): Route =>
  fromLearn(pullRequestPath({ repo: fix.repo, issue: fix.issueNumber }));

/** Every merged fix made with Learn: Issues with "Fixed" set. */
export const ALL_FIXES_PATH: Route = issuesHrefOf({ ...ISSUES_VIEW, fixed: true });

/** A course's merged fixes: its view of Issues with "Fixed" set. */
export const courseFixesPathOf = (course: string): Route =>
  issuesHrefOf({ ...ISSUES_VIEW, course, fixed: true }, 'course');

/** A lesson's merged fixes: its view of Issues with "Fixed" set. */
export const lessonFixesPathOf = (lesson: string): Route =>
  issuesHrefOf({ ...ISSUES_VIEW, lesson, fixed: true }, 'lesson');

/** A lesson's open issues: its view of Issues. */
export const lessonIssuesPathOf = (lesson: string): Route => learnLessonRealWorldPath(lesson);

/* ------------------------------------------------------------------------------------------------------------------ */
/* Words                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** "5 open issues", "One open issue", "1,000+ open issues"; null for none. */
export function openIssuesWordsOf(count: number | null | undefined): string | null {
  const text = issuesCountTextOf(count);
  if (!text) return null;
  return text === '1' ? 'One open issue' : `${text} open issues`;
}

/** The third box with no fix that needs the person: the open issues that fit them. */
export function issuesBoxWordsOf(count: number): { title: string; text: string; button: string } {
  return {
    title: `${openIssuesWordsOf(count) ?? 'Open issues'} for you`,
    text: 'In your languages, at your level or one above. A merged fix moves a lesson to Mastered.',
    button: 'See the issues',
  };
}

/** The third box's words for the person's fix, as the board draws each state. */
export type FixBoxWords = {
  eyebrow: string;
  title: string;
  text: string;
  /** The box's one button: the fix's own page, or the person's Skills page. */
  button: { label: string; to: 'fix' | 'skills' };
};

const NEEDS_YOU_TEXT: Partial<Record<PullRequestBox, string>> = {
  WALKTHROUGH: 'Answer the questions about your fix. Then you can open the pull request.',
  APPROVE: 'You passed the fix walkthrough. Read the change, then approve it.',
  ONLY_YOU: 'There is a step only you can take. Its page says what to do.',
  ROUND_WAITING: 'Read what was asked and decide what your agent does next.',
  ROUND_READY: 'Your agent made the change. Read it, then approve it.',
};

const WORKING_TEXT: Partial<Record<PullRequestBox, string>> = {
  ROUND_WORKING: 'Nothing to do yet. We tell you when the change is ready.',
  OPENING: 'Nothing to do yet. Your agent is opening the pull request.',
};

export function fixBoxWordsOf(row: PullRequestListRow, state: HomeFixState): FixBoxWords {
  const open = { label: 'Open your contribution', to: 'fix' as const };
  switch (state) {
    case 'needs-you': {
      const words = needsYouRowWordsOf(row);
      return {
        eyebrow: 'Your fix needs you',
        title: words?.line ?? 'Your fix needs you',
        text: NEEDS_YOU_TEXT[row.box] ?? 'Open your fix to see what to do next.',
        button: { label: words?.button ?? 'Open your fix', to: 'fix' },
      };
    }
    case 'working':
      return {
        eyebrow: 'Your fix',
        title: 'Your agent is working on it',
        text: WORKING_TEXT[row.box] ?? 'Nothing to do yet. We tell you when the fix walkthrough is ready.',
        button: open,
      };
    case 'open':
      return {
        eyebrow: 'Your fix',
        title: 'Pull request open',
        text: row.lesson
          ? 'Waiting for a maintainer. The lesson becomes Mastered when it is merged.'
          : 'Waiting for a maintainer.',
        button: open,
      };
    case 'merged':
      return {
        eyebrow: 'Your fix',
        title: 'Your fix was merged',
        text: row.lesson ? `“${row.lesson.title}” is now Mastered.` : 'The project has your fix now.',
        button: { label: 'See your Skills page', to: 'skills' },
      };
  }
}

/**
 * The third box with the person's fix merged in the last 7 days, as the board draws it: the lesson it made Mastered,
 * only when it did (and names it); else that the project has the fix.
 */
export function mergedBoxWordsOf(fix: Pick<LearnMergedFix, 'mastered' | 'lesson'>): {
  eyebrow: string;
  title: string;
  text: string;
  button: string;
} {
  return {
    eyebrow: 'Your fix',
    title: 'Your fix was merged',
    text: fix.mastered && fix.lesson ? `“${fix.lesson.title}” is now Mastered.` : 'The project has your fix now.',
    button: 'See your Skills page',
  };
}

/** The quiet line under a fix that needs the person: the open issues that fit them; null for none. */
export function fixBoxIssuesLineOf(count: number | null): string | null {
  const words = openIssuesWordsOf(count);
  return words ? `${words} ${count === 1 ? 'fits' : 'fit'} you.` : null;
}

/** The third box with no fix and no open issue that fits the person: quiet, with the email for a new one. */
export const NO_ISSUES_BOX_WORDS = {
  eyebrow: 'Fix a real issue',
  title: 'No open issue for you right now',
  text: 'We check new issues every day.',
} as const;

/** A course's third box: the open issues of the person's list for lessons of the course. */
export function courseIssuesBoxWordsOf(count: number): { title: string; text: string; button: string } {
  return {
    title: `${openIssuesWordsOf(count) ?? 'Open issues'} for this course`,
    text: 'From your list, each linked to a lesson of this course. A merged fix moves its lesson to Mastered.',
    button: 'See the issues',
  };
}

/** A course's merged fixes are named from five. */
export const COURSE_FIXES_SHOWN_FROM = 5;

/** "212 real issues fixed" on a course's page: from five, else null. */
export function courseFixesCountOf(issuesFixed: number | null | undefined): number | null {
  const count = numberOf(issuesFixed);
  return count !== null && count >= COURSE_FIXES_SHOWN_FROM ? Math.floor(count) : null;
}

/** The landing's section shows from three merged fixes, and how many there are from five. */
export const LANDING_FIXES_SHOWN_FROM = 3;
export const LANDING_FIXES_COUNT_FROM = 5;

/** The landing's merged fixes: the three newest, or none with fewer; how many from five. */
export function landingFixesOf(fixes: LearnFixes | null): { rows: LearnFixRow[]; total: number | null } | null {
  if (!fixes || fixes.rows.length < LANDING_FIXES_SHOWN_FROM) return null;
  return {
    rows: fixes.rows.slice(0, LANDING_FIXES_SHOWN_FROM),
    total: fixes.total >= LANDING_FIXES_COUNT_FROM ? fixes.total : null,
  };
}

/** Under a lesson: three merged fixes at most, and three issues of the person's list. */
export const LESSON_FIXES_SHOWN = 3;
export const LESSON_ISSUES_SHOWN = 3;

/** Where a person's fix that uses a lesson stands, as "In the real world" says it. */
export function myFixWordsOf(fix: LearnMyFix): { pill: string; merged: boolean; text: string } {
  if (fix.state === 'MERGED') {
    const merged = mergedOnOf(fix.at);
    return {
      pill: 'merged',
      merged: true,
      text: `You used this lesson in a real fix.${merged ? ` It was ${merged}.` : ''}`,
    };
  }
  if (fix.state === 'OPEN') {
    return {
      pill: 'pull request open',
      merged: false,
      text: `You are using this lesson in a real fix. ${fix.number !== null ? `Pull request #${fix.number}` : 'Its pull request'} is waiting for a maintainer.`,
    };
  }
  return {
    pill: 'in progress',
    merged: false,
    text: 'You are using this lesson in a real fix. Its pull request is not open yet.',
  };
}

/** The depth line's tail while a fix of the person's that uses the lesson is not merged yet. */
export const FIX_ON_ITS_WAY_TAIL = 'It becomes Mastered when your fix is merged.';

/** Whether the person has a fix of theirs for the lesson that is not merged yet. */
export const fixOnItsWay = (fix: LearnMyFix | null | undefined): boolean => !!fix && fix.state !== 'MERGED';

export const REAL_WORLD_WORDS = {
  title: 'In the real world',
  yourFix: 'Your fix',
  fixes: 'Fixes that used it',
  otherFixes: 'Fixes by other people',
  issues: 'Fix one yourself',
  fixesNone: 'No fix has used this idea yet. When someone fixes a real issue with it, the fix shows here.',
  issuesNone: 'No open issue for this lesson right now. We check new issues every day.',
  issuesNote: 'Likely about this lesson. A merged fix that uses this idea moves the lesson to Mastered.',
  openFix: 'Open your contribution',
  issuesLink: 'Open issues for this lesson',
} as const;

/** "All 12 fixes": the link to the lesson's merged fixes, while more are there than shown; null otherwise. */
export const allFixesWordsOf = (total: number, shown: number): string | null =>
  total > shown ? `All ${total.toLocaleString('en-US')} fixes` : null;

/** The "Fix a real issue" button after a right answer. */
export const FIX_A_REAL_ISSUE = 'Fix a real issue';

/** Learn home's rows of real issues: its heading and its link. */
export const HOME_REAL_WORDS = { title: 'Real issues', all: 'All issues', allHref: LEARN_ISSUES_PATH } as const;

/** The landing's merged fixes. */
export function landingFixesLineOf(total: number | null): string {
  const lead = total ? `${total.toLocaleString('en-US')} merged so far, each` : 'Each';
  return `${lead} in the name of the person who learned from it.`;
}
