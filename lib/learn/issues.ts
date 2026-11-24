import type { Route } from 'next';

import { languageNameOf } from './learn-question';
import {
  coursePath,
  isContentSlug,
  LEARN_ISSUES_PATH,
  LEARN_SETUP_PATH,
  learnCourseRealWorldPath,
  learnLessonPath,
  learnLessonRealWorldPath,
  markdownPathOf,
} from './paths';
import { SETUP_LANGUAGES } from './setup';
import type { FullIssue, MaskedIssue } from '@/lib/workspace/masked-issue.types';

/*
 * Issues (page 8): one list of real open issues, each masked with the lesson it uses or teaches. The switches ("For
 * you", "Lessons I learned") and the chips (a course, a lesson, a language, "Fixed") live in the address, so a view
 * can be linked. A visitor sees the same five for the view; a signed-in person sees their own five with the switches.
 */

/* ------------------------------------------------------------------------------------------------------------------ */
/* What the API answers                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

/** What a row says of its lesson: "Uses …, which you learned", "Teaches …, which is new for you", or no line. */
export type LearnIssueWhy = 'USES_LEARNED' | 'TEACHES_NEW' | 'NO_LESSON';

/** The lesson an issue is linked to. */
export type LearnIssueLesson = { slug: string; title: string; course: string; courseName: string };

/** A row of Learn's list: the masked issue with its lesson and why; `full` only on a row whose project the viewer named. */
export type IssuesRow = {
  issue: MaskedIssue;
  full: FullIssue | null;
  lesson: LearnIssueLesson | null;
  why: LearnIssueWhy;
  learnOnly: boolean;
};

/** Which empty end the list shows: issues wait outside "For you" (counted in `outsideForYou`), or none at all. */
export type IssuesEmptyEnd = 'OUTSIDE_FOR_YOU' | 'NONE';

/** The signed-in person's five, the count of each switch flipped (null for none), the empty end and the email's switch. */
export type IssuesList = {
  rows: IssuesRow[];
  forYouCount: number | null;
  learnedCount: number | null;
  emptyEnd: IssuesEmptyEnd | null;
  outsideForYou: number | null;
  /** "A new issue for you" is on. */
  emailOn: boolean;
  /** The address that email goes to, as the API shows it; null when there is none. */
  emailTo: string | null;
};

/** A visitor's five for a view. */
export type IssuesListPublic = { rows: IssuesRow[] };

/** The list "A new issue for you" covers. */
export type IssuesEmailCover = 'FOR_YOU' | 'LEARNED';

/** "A new issue for you" as a save answers it. */
export type LearnIssuesEmail = { newIssues: boolean; newIssuesCover: IssuesEmailCover | null };

/** A merged fix made with Learn. */
export type LearnFixRow = {
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  /** The pull request's number. */
  number: number;
  title: string;
  issueUrl: string;
  /** The pull request's address. */
  url: string;
  /** The fixer's login. */
  fixer: string;
  lesson: LearnIssueLesson | null;
  mergedAt: string | null;
};

/** Ten merged fixes at most, how many the view holds, and the next page's cursor (null on the last). */
export type LearnFixes = { rows: LearnFixRow[]; total: number; next: string | null };

/* ------------------------------------------------------------------------------------------------------------------ */
/* The view in the address                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The languages a view may name, as the API takes them. */
export type IssuesLanguage = (typeof SETUP_LANGUAGES)[number];

/**
 * What the address sets: the chips (set by the link that opened the page, never picked by hand) and the two
 * switches. "For you" is on unless `?for-you=0`; "Lessons I learned" is off unless `?learned=1`.
 */
export type IssuesView = {
  lesson: string | null;
  course: string | null;
  language: IssuesLanguage | null;
  fixed: boolean;
  forYou: boolean;
  learned: boolean;
};

/** The page's own address: Issues, or the view of one lesson or one course at its own address. */
export type IssuesAt = 'issues' | 'lesson' | 'course';

export const ISSUES_VIEW: IssuesView = {
  lesson: null,
  course: null,
  language: null,
  fixed: false,
  forYou: true,
  learned: false,
};

type Query = Record<string, string | string[] | undefined>;

/** One value of a query parameter as written; the first when it is repeated. */
const one = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? null) : null;

const slugOf = (value: string | null) => (value !== null && isContentSlug(value) ? value : null);

/** A language a view may name; null for anything else. */
export function issuesLanguageOf(value: unknown): IssuesLanguage | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase();
  return (SETUP_LANGUAGES as readonly string[]).includes(lower) ? (lower as IssuesLanguage) : null;
}

/**
 * The view an address sets; a value of the wrong shape is left out. A lesson's or a course's own address sets that
 * lesson or course from its path (`fromPath`), over the query.
 */
export function issuesViewOf(query: Query, fromPath: Partial<Pick<IssuesView, 'lesson' | 'course'>> = {}): IssuesView {
  return {
    lesson: fromPath.lesson ?? slugOf(one(query.lesson)),
    course: fromPath.course ?? slugOf(one(query.course)),
    language: issuesLanguageOf(one(query.language)),
    fixed: one(query.fixed) === '1',
    forYou: one(query['for-you']) !== '0',
    learned: one(query.learned) === '1',
  };
}

/** Where the address of a view starts: a lesson's or a course's own address while the view still names it. */
function baseOf(view: IssuesView, at: IssuesAt): { path: string; drop: 'lesson' | 'course' | null } {
  if (at === 'lesson' && view.lesson) return { path: learnLessonRealWorldPath(view.lesson), drop: 'lesson' };
  if (at === 'course' && view.course) return { path: learnCourseRealWorldPath(view.course), drop: 'course' };
  return { path: LEARN_ISSUES_PATH, drop: null };
}

/** The query of a view, in one order, without what is as it is by default. */
function queryOf(view: IssuesView, drop: 'lesson' | 'course' | null): string {
  const query = new URLSearchParams();
  if (view.course && drop !== 'course') query.set('course', view.course);
  if (view.lesson && drop !== 'lesson') query.set('lesson', view.lesson);
  if (view.language) query.set('language', view.language);
  if (view.fixed) query.set('fixed', '1');
  if (!view.forYou) query.set('for-you', '0');
  if (view.learned) query.set('learned', '1');
  return query.toString();
}

/**
 * A view's address. On a lesson's or a course's own address the view stays there while it names that lesson or course;
 * a view without it is Issues' own.
 */
export function issuesHrefOf(view: IssuesView, at: IssuesAt = 'issues'): Route {
  const { path, drop } = baseOf(view, at);
  const query = queryOf(view, drop);
  return (query ? `${path}?${query}` : path) as Route;
}

/**
 * The query of a view on Issues' own address (its chips and switches, the lesson and the course among them): what a
 * row's link carries to the page of one issue, so its way back opens this view again.
 */
export const issuesViewQueryOf = (view: IssuesView): string => queryOf(view, null);

/** The address search engines are pointed to: the view's chips, with the switches as they are by default. */
export const issuesCanonicalOf = (view: IssuesView, at: IssuesAt = 'issues'): Route =>
  issuesHrefOf({ ...view, forYou: true, learned: false }, at);

/** The view's Markdown copy: its own address with `.md`, the chips kept and the switches left out. */
export function issuesMarkdownPathOf(view: IssuesView, at: IssuesAt = 'issues'): string {
  const { path, drop } = baseOf(view, at);
  const query = queryOf({ ...view, fixed: false, forYou: true, learned: false }, drop);
  return query ? `${markdownPathOf(path)}?${query}` : markdownPathOf(path);
}

/** Where the browser reads the signed-in person's five for a view. */
export const LEARN_ISSUES_MINE_PATH = '/api/me/learn/issues';
export function issuesMinePathOf(view: IssuesView): string {
  const query = queryOf({ ...view, fixed: false }, null);
  return query ? `${LEARN_ISSUES_MINE_PATH}?${query}` : LEARN_ISSUES_MINE_PATH;
}

/** The view with no chip: the switches kept. */
export const unchippedOf = (view: IssuesView): IssuesView => ({
  ...ISSUES_VIEW,
  forYou: view.forYou,
  learned: view.learned,
});

/** Whether the view names a lesson, a course or a language: what narrows the open issues. */
export const hasScope = (view: IssuesView): boolean => !!(view.lesson || view.course || view.language);

/* ------------------------------------------------------------------------------------------------------------------ */
/* Chips                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The names the chips show, read from the content; a slug stands in when its name could not be read. */
export type IssuesNames = { lesson?: string | null; course?: string | null };

/** One chip: what it says, and the address without it (its cross). */
export type IssuesChip = { key: 'course' | 'lesson' | 'language' | 'fixed'; label: string; removeHref: Route };

/** The chips of a view, in the boards' order: the course, the lesson, the language, then "Fixed". */
export function issuesChipsOf(view: IssuesView, names: IssuesNames = {}, at: IssuesAt = 'issues'): IssuesChip[] {
  const chips: IssuesChip[] = [];
  if (view.course) {
    chips.push({
      key: 'course',
      label: `Course: ${names.course ?? view.course}`,
      removeHref: issuesHrefOf({ ...view, course: null }, at),
    });
  }
  if (view.lesson) {
    chips.push({
      key: 'lesson',
      label: `Lesson: ${names.lesson ?? view.lesson}`,
      removeHref: issuesHrefOf({ ...view, lesson: null }, at),
    });
  }
  if (view.language) {
    chips.push({
      key: 'language',
      label: `Language: ${languageNameOf(view.language)}`,
      removeHref: issuesHrefOf({ ...view, language: null }, at),
    });
  }
  if (view.fixed) chips.push({ key: 'fixed', label: 'Fixed', removeHref: issuesHrefOf({ ...view, fixed: false }, at) });
  return chips;
}

/** Where the row above the chips leads back to: the lesson or the course that opened the page; null for none. */
export function issuesBackOf(view: IssuesView, names: IssuesNames = {}): { label: string; href: Route } | null {
  if (view.lesson) return { label: names.lesson ?? view.lesson, href: learnLessonPath(view.lesson) };
  if (view.course) return { label: names.course ?? view.course, href: coursePath(view.course) };
  return null;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Switches and counts                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The API's count past its cap: 1,001 reads as "1,000+". */
const COUNT_CAP = 1_000;

/** A switch's count as shown: "212", "1,000+"; null for none (a zero is never shown). */
export function issuesCountTextOf(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null;
  if (count > COUNT_CAP) return `${COUNT_CAP.toLocaleString('en-US')}+`;
  return Math.round(count).toLocaleString('en-US');
}

/** One of the two switches, as the page draws it. */
export type IssuesSwitch = {
  key: 'for-you' | 'learned';
  label: string;
  on: boolean;
  /** How many issues the list holds once it is pressed; null for none. */
  count: string | null;
  /** The view once it is pressed. */
  href: Route;
};

export const FOR_YOU_LABEL = 'For you';
export const LEARNED_LABEL = 'Lessons I learned';

/** The two switches of a signed-in person's list, each with the count the API gives for it flipped. */
export function issuesSwitchesOf(
  view: IssuesView,
  list: Pick<IssuesList, 'forYouCount' | 'learnedCount'> | null,
  at: IssuesAt = 'issues',
): IssuesSwitch[] {
  return [
    {
      key: 'for-you',
      label: FOR_YOU_LABEL,
      on: view.forYou,
      count: issuesCountTextOf(list?.forYouCount),
      href: issuesHrefOf({ ...view, forYou: !view.forYou }, at),
    },
    {
      key: 'learned',
      label: LEARNED_LABEL,
      on: view.learned,
      count: issuesCountTextOf(list?.learnedCount),
      href: issuesHrefOf({ ...view, learned: !view.learned }, at),
    },
  ];
}

/** What screen readers hear for a switch's count: what pressing it would show. */
export const switchCountLabelOf = (count: string): string =>
  `${count} ${count === '1' ? 'issue' : 'issues'} once pressed`;

/** The line under the switches while "For you" is on, and where its link goes. */
export const FOR_YOU_LINE = '“For you” is on: your languages, at your level or one above.';
export const FOR_YOU_CHANGE = { label: 'Change your languages or level', href: LEARN_SETUP_PATH } as const;

/* ------------------------------------------------------------------------------------------------------------------ */
/* Rows                                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The lesson line of a row: none without a lesson; a visitor's always says the lesson is new. */
export function rowLessonOf(
  row: Pick<IssuesRow, 'lesson' | 'why'>,
  visitor = false,
): { title: string; href: Route; learned: boolean } | null {
  if (!row.lesson || row.why === 'NO_LESSON') return null;
  return {
    title: row.lesson.title,
    href: learnLessonPath(row.lesson.slug),
    learned: !visitor && row.why === 'USES_LEARNED',
  };
}

/** A row made of a masked issue alone (a skip's next issue, when the list cannot be read again): no lesson line. */
export const bareRowOf = (issue: MaskedIssue): IssuesRow => ({
  issue,
  full: null,
  lesson: null,
  why: 'NO_LESSON',
  learnOnly: false,
});

/**
 * The rows once a skip is answered, read again: the skipped row's place takes the first row of the new read that is
 * not on the screen and not skipped in this view (`leftOut`), and the other rows stay where they are, so the list does
 * not move. With nothing new in the read, the skipped row leaves. `fallback` (the skip's next issue as a bare row) takes
 * the place only when the read failed (`read` null).
 */
export function rowsAfterSkip(
  current: readonly IssuesRow[],
  skippedId: string,
  read: readonly IssuesRow[] | null,
  { fallback = null, leftOut = [] }: { fallback?: IssuesRow | null; leftOut?: Iterable<string> } = {},
): IssuesRow[] {
  const shut = new Set([...current.map((row) => row.issue.id), ...leftOut]);
  const incoming = read ? read.find((row) => !shut.has(row.issue.id)) : fallback;
  const takes = incoming && !shut.has(incoming.issue.id) ? incoming : null;
  return current.flatMap((row) => (row.issue.id === skippedId ? (takes ? [takes] : []) : [row]));
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Empty ends                                                                                                         */
/* ------------------------------------------------------------------------------------------------------------------ */

/** What an empty list says, and the one press that would show something. */
export type IssuesEnd = {
  title: string;
  text: string;
  /** "Turn off “For you”" or "Turn off “Lessons I learned”": only when issues wait behind the switch. */
  turnOff: { label: string; href: Route } | null;
  /** "Email me when one appears": on an empty end of the whole list, never of a lesson's, a course's or a language's. */
  email: boolean;
};

/** "for this lesson", "in this course", "in Go": what a view narrows to, in a sentence. */
function scopeWordsOf(view: IssuesView): string {
  if (view.lesson) return 'for this lesson';
  if (view.course) return 'in this course';
  return view.language ? `in ${languageNameOf(view.language)}` : '';
}

const issuesWord = (count: number) =>
  count === 1 ? 'One open issue is' : `${count.toLocaleString('en-US')} open issues are`;

/** The end of a signed-in person's list that has no row; null while it has rows. */
export function issuesEndOf(view: IssuesView, list: IssuesList, at: IssuesAt = 'issues'): IssuesEnd | null {
  if (list.rows.length) return null;
  const scoped = hasScope(view);
  const scope = scopeWordsOf(view);
  const outside = list.emptyEnd === 'OUTSIDE_FOR_YOU' && view.forYou ? (list.outsideForYou ?? 0) : 0;
  if (outside > 0) {
    const turnOff = { label: 'Turn off “For you”', href: issuesHrefOf({ ...view, forYou: false }, at) };
    if (scoped) {
      return {
        title: 'No issue matches',
        text: `There is no open issue ${scope} in your languages and at your level right now. ${issuesWord(outside)} outside them.`,
        turnOff,
        email: false,
      };
    }
    return {
      title: 'No open issue for you right now',
      text: `An issue shows here when it is in one of your languages and uses a lesson at your level or one above. We look for new ones every day. ${issuesWord(outside)} outside your languages or level.`,
      turnOff,
      email: true,
    };
  }
  const learnedWaiting = view.learned && (list.learnedCount ?? 0) > 0;
  const turnOffLearned = learnedWaiting
    ? { label: 'Turn off “Lessons I learned”', href: issuesHrefOf({ ...view, learned: false }, at) }
    : null;
  if (scoped) {
    return {
      title: 'No issue matches',
      text: view.learned
        ? `There is no open issue ${scope} that uses a lesson you learned right now. We look for new ones every day.`
        : `There is no open issue ${scope} right now. We look for new ones every day.`,
      turnOff: turnOffLearned,
      email: false,
    };
  }
  return {
    title: view.learned ? 'No open issue uses a lesson you learned right now' : 'No open issue right now',
    text: 'We look for new ones every day.',
    turnOff: turnOffLearned,
    email: true,
  };
}

/** The end of a visitor's list that has no row. */
export function visitorEndOf(view: IssuesView): Pick<IssuesEnd, 'title' | 'text'> {
  return hasScope(view)
    ? {
        title: 'No issue matches',
        text: `There is no open issue ${scopeWordsOf(view)} right now. We look for new ones every day.`,
      }
    : { title: 'No open issue right now', text: 'We look for new ones every day.' };
}

/** The end of the merged fixes when there are none. */
export const FIXES_EMPTY = {
  title: 'No fix merged yet',
  text: 'Fixes made with Learn show here once their pull requests are merged.',
} as const;

/* ------------------------------------------------------------------------------------------------------------------ */
/* "Email me when one appears"                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export const EMAIL_ME_LABEL = 'Email me when one appears';

/** The list the email covers: the one the switches show when it is pressed. */
export const emailCoverOf = (view: Pick<IssuesView, 'learned'>): IssuesEmailCover =>
  view.learned ? 'LEARNED' : 'FOR_YOU';

/**
 * Where "A new issue for you" stands, as the page says it: off (the button), on with the address it goes to, or on
 * with no address, which says so in place and never looks on while it can send nothing.
 */
export type IssuesEmailState = { kind: 'off' } | { kind: 'on'; to: string } | { kind: 'no-address' };

export function issuesEmailStateOf(list: Pick<IssuesList, 'emailOn' | 'emailTo'>): IssuesEmailState {
  if (!list.emailOn) return { kind: 'off' };
  return list.emailTo ? { kind: 'on', to: list.emailTo } : { kind: 'no-address' };
}

/** The line in the button's place once it is on. */
export const emailOnLineOf = (to: string): string => `We’ll email you at ${to} when one appears.`;

/* ------------------------------------------------------------------------------------------------------------------ */
/* Words                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The page's title, for screen readers and search engines; the list itself has no visible title. */
export const ISSUES_TITLE = 'Real issues and fixes';
export const ISSUES_DESCRIPTION =
  'Open issues in real projects, each with the lesson it uses or teaches. Your own AI agent fixes one, and its walkthrough teaches you the change.';

/** Under a visitor's five. */
export const VISITOR_NOTE = 'Sign in with GitHub to see the issues that fit your languages and level.';

/** When the API does not answer the list (an older API, or one that answers none). */
export const ISSUES_UNAVAILABLE = {
  title: 'Real issues are not here yet',
  text: 'The list of real issues to learn from is not available right now. Your courses and lessons work as usual.',
} as const;

/** When the person's list did not load. */
export const ISSUES_FAILED = 'The issues didn’t load. Try again in a minute.';

/** "merged 18 Nov": the day a fix was merged, in UTC; null without a date. */
export function mergedOnOf(mergedAt: string | null): string | null {
  if (!mergedAt) return null;
  const at = new Date(mergedAt);
  if (Number.isNaN(at.getTime())) return null;
  return `merged ${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Answers checked                                                                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

const isWhy = (value: unknown): value is LearnIssueWhy =>
  value === 'USES_LEARNED' || value === 'TEACHES_NEW' || value === 'NO_LESSON';

const countOrNull = (value: unknown): number | null => (typeof value === 'number' && value > 0 ? value : null);

/** A row as the API sends it, or null when it is not one: a row without its masked issue is left out. */
export function issuesRowOf(value: unknown): IssuesRow | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const issue = raw.issue as MaskedIssue | null | undefined;
  if (!issue || typeof issue.id !== 'string' || typeof issue.title !== 'string') return null;
  const lesson = raw.lesson as LearnIssueLesson | null | undefined;
  const lessonOk = !!lesson && typeof lesson.slug === 'string' && typeof lesson.title === 'string';
  return {
    issue: { ...issue, hints: Array.isArray(issue.hints) ? issue.hints : [] },
    full: (raw.full as FullIssue | null | undefined) ?? null,
    lesson: lessonOk ? lesson : null,
    why: isWhy(raw.why) && lessonOk ? raw.why : 'NO_LESSON',
    learnOnly: raw.learnOnly === true,
  };
}

const rowsOf = (value: unknown): IssuesRow[] =>
  Array.isArray(value) ? value.map(issuesRowOf).filter((row): row is IssuesRow => row !== null) : [];

/** The person's list as the API sends it; null when it is not one. */
export function issuesListOf(value: unknown): IssuesList | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.rows)) return null;
  return {
    rows: rowsOf(raw.rows),
    forYouCount: countOrNull(raw.forYouCount),
    learnedCount: countOrNull(raw.learnedCount),
    emptyEnd: raw.emptyEnd === 'OUTSIDE_FOR_YOU' || raw.emptyEnd === 'NONE' ? raw.emptyEnd : null,
    outsideForYou: countOrNull(raw.outsideForYou),
    emailOn: raw.emailOn === true,
    emailTo: typeof raw.emailTo === 'string' && raw.emailTo ? raw.emailTo : null,
  };
}

/** A visitor's list as the API sends it; null when it is not one. */
export function issuesListPublicOf(value: unknown): IssuesListPublic | null {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { rows?: unknown }).rows)) return null;
  return { rows: rowsOf((value as { rows: unknown }).rows) };
}

/** What the API's input takes from a view: the chips that narrow, and for a person the two switches. */
export const issuesPublicInputOf = (view: IssuesView) => ({
  lesson: view.lesson,
  course: view.course,
  language: view.language,
});

export const issuesInputOf = (view: IssuesView) => ({
  ...issuesPublicInputOf(view),
  forYou: view.forYou,
  learned: view.learned,
});
