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
  orgLoginOf,
  repoNameOf,
} from './paths';
import { SETUP_LANGUAGES } from './setup';
import type { FullIssue, MaskedIssue } from '@/lib/workspace/masked-issue.types';

/*
 * Issues: one list of real open issues, each masked with the lesson it uses or teaches. The switches ("For
 * you", "Lessons I learned") and the chips (a course, a lesson, a project, a language, "Fixed") live in the address,
 * so a view can be linked. A visitor sees the same five for the view; a signed-in person sees their own five with the switches.
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
  /** "Email me issues for my lessons" is on; null when the API does not say. */
  lessonIssues: boolean | null;
  /** On a view of one lesson: whether that email covers the lesson for the person; null otherwise. */
  lessonIssuesCovered: boolean | null;
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
  /** Learn's language of the project (`go`, `javascript`); null or left out when not known. */
  language?: string | null;
};

/** Ten merged fixes at most, how many the view holds, and the next page's cursor (null on the last). */
export type LearnFixes = { rows: LearnFixRow[]; total: number; next: string | null };

/* ------------------------------------------------------------------------------------------------------------------ */
/* The view in the address                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The languages a view may name, as the API takes them. */
export type IssuesLanguage = (typeof SETUP_LANGUAGES)[number];

/**
 * What a view shows: the open issues and the merged fixes together (`both`, a lesson's or a course's own address
 * only), the open issues alone (`open`), or the merged fixes alone (`fixed`).
 */
export type IssuesShow = 'both' | 'open' | 'fixed';

/**
 * What the address sets: the chips (set by the link that opened the page, never picked by hand) and the two
 * switches. "For you" is on unless `?for-you=0`; "Lessons I learned" is off unless `?learned=1`. What the view shows
 * is written `fixed=1` (the fixes alone) and, on a lesson's or a course's own address, `open=1` (the open issues
 * alone); no address says `show`.
 */
export type IssuesView = {
  lesson: string | null;
  course: string | null;
  /** One repository, `owner/name` in lower case: the issues of a project. */
  repo: string | null;
  /** One organisation's login, in lower case: the issues of its projects. Never with `repo`. */
  org: string | null;
  language: IssuesLanguage | null;
  show: IssuesShow;
  forYou: boolean;
  learned: boolean;
};

/** The page's own address: Issues, or the view of one lesson or one course at its own address. */
export type IssuesAt = 'issues' | 'lesson' | 'course';

export const ISSUES_VIEW: IssuesView = {
  lesson: null,
  course: null,
  repo: null,
  org: null,
  language: null,
  show: 'open',
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

/** A project's name from the address, in lower case (GitHub's names are not case-sensitive); null for another shape. */
const projectNameOf = (value: string | null, shape: (value: string) => string | null) =>
  value === null ? null : (shape(value)?.toLowerCase() ?? null);

/**
 * What a view shows on the page it is on (`at`): at a lesson's or a course's own address both groups, unless the
 * address asks for the fixes alone (`fixed=1`) or the open issues alone (`open=1`); on Issues the open issues, or the
 * fixes with `fixed=1`.
 */
function showOf(query: Query, at: IssuesAt): IssuesShow {
  if (one(query.fixed) === '1') return 'fixed';
  if (at === 'issues') return 'open';
  return one(query.open) === '1' ? 'open' : 'both';
}

/**
 * The view an address sets; a value of the wrong shape is left out, and so is an organisation beside a repository
 * (the repository is the narrower). A lesson's or a course's own address sets that lesson or course from its path
 * (`fromPath`), over the query, and is the page the view is on: there it shows both groups by default.
 */
export function issuesViewOf(query: Query, fromPath: Partial<Pick<IssuesView, 'lesson' | 'course'>> = {}): IssuesView {
  const repo = projectNameOf(one(query.repo), repoNameOf);
  const at: IssuesAt = fromPath.lesson ? 'lesson' : fromPath.course ? 'course' : 'issues';
  return {
    lesson: fromPath.lesson ?? slugOf(one(query.lesson)),
    course: fromPath.course ?? slugOf(one(query.course)),
    repo,
    org: repo ? null : projectNameOf(one(query.org), orgLoginOf),
    language: issuesLanguageOf(one(query.language)),
    show: showOf(query, at),
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

/** A query as the pages write it: a repository keeps its `/` (`repo=django/django`), as every link to it writes it. */
const queryText = (query: URLSearchParams) => query.toString().replace(/%2F/g, '/');

/**
 * The query of a view, in one order, without what is as it is by default. `own`: the address is a lesson's or a
 * course's own view, where both groups are the default and the open issues alone are `open=1`; on Issues the open
 * issues are the default, and `both` is never meant there.
 */
function queryOf(view: IssuesView, drop: 'lesson' | 'course' | null, own = drop !== null): string {
  const query = new URLSearchParams();
  if (view.course && drop !== 'course') query.set('course', view.course);
  if (view.lesson && drop !== 'lesson') query.set('lesson', view.lesson);
  if (view.repo) query.set('repo', view.repo);
  else if (view.org) query.set('org', view.org);
  if (view.language) query.set('language', view.language);
  if (view.show === 'fixed') query.set('fixed', '1');
  else if (view.show === 'open' && own) query.set('open', '1');
  if (!view.forYou) query.set('for-you', '0');
  if (view.learned) query.set('learned', '1');
  return queryText(query);
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
 * The query of a view on Issues' own address (its chips and switches, the lesson and the course among them), and the
 * page it is on when that is a lesson's or a course's own view (`at`): what a row's link carries to the page of one
 * issue, so its way back opens this view again, at its own address (`issuesHrefOf`).
 */
export function issuesViewQueryOf(view: IssuesView, at: IssuesAt = 'issues'): string {
  const own = baseOf(view, at).drop !== null;
  const query = new URLSearchParams(queryOf(view, null, own));
  if (own) query.set('at', at);
  return queryText(query);
}

/** Whether the view is on a lesson's or a course's own address, which shows both groups. */
export const isOwnView = (view: IssuesView, at: IssuesAt): boolean => baseOf(view, at).drop !== null;

/**
 * The address search engines are pointed to. On a lesson's or a course's own address every variant (`fixed=1`,
 * `open=1`, the chips, the switches) points to that bare address. On Issues: the view's chips with the switches as
 * they are by default, and `fixed=1` is a page of its own.
 */
export function issuesCanonicalOf(view: IssuesView, at: IssuesAt = 'issues'): Route {
  const { path, drop } = baseOf(view, at);
  if (drop) return path as Route;
  return issuesHrefOf({ ...view, forYou: true, learned: false }, at);
}

/** The view's Markdown copy: its own address with `.md`, the chips kept and the switches left out. */
export function issuesMarkdownPathOf(view: IssuesView, at: IssuesAt = 'issues'): string {
  const { path, drop } = baseOf(view, at);
  const query = queryOf({ ...view, show: drop ? 'both' : 'open', forYou: true, learned: false }, drop);
  return query ? `${markdownPathOf(path)}?${query}` : markdownPathOf(path);
}

/** Where the browser reads the signed-in person's five for a view. */
export const LEARN_ISSUES_MINE_PATH = '/api/me/learn/issues';
export function issuesMinePathOf(view: IssuesView): string {
  const query = queryOf({ ...view, show: 'open' }, null);
  return query ? `${LEARN_ISSUES_MINE_PATH}?${query}` : LEARN_ISSUES_MINE_PATH;
}

/** The view with no chip: the switches kept. */
export const unchippedOf = (view: IssuesView): IssuesView => ({
  ...ISSUES_VIEW,
  forYou: view.forYou,
  learned: view.learned,
});

/** Whether the view names a lesson, a course, a project or a language: what narrows the open issues. */
export const hasScope = (view: IssuesView): boolean =>
  !!(view.lesson || view.course || view.repo || view.org || view.language);

/* ------------------------------------------------------------------------------------------------------------------ */
/* Chips                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The names the chips show, read from the content; a slug stands in when its name could not be read. */
export type IssuesNames = { lesson?: string | null; course?: string | null };

/** One chip: what it says, and the address without it (its cross). */
export type IssuesChip = {
  key: 'show' | 'course' | 'lesson' | 'repo' | 'org' | 'language' | 'fixed';
  label: string;
  removeHref: Route;
};

/** What a lesson's or a course's own view shows, as its chip says it. */
export const SHOW_CHIP_LABELS: Record<IssuesShow, string> = { both: 'Open and fixed', open: 'Open', fixed: 'Fixed' };

/**
 * The chips of a view, in the boards' order: the course, the lesson, the project ("Repository: django/django" or
 * "Org: kubernetes"), the language, then "Fixed". On a lesson's or a course's own address the view's own chip comes
 * first ("Open and fixed", "Open" or "Fixed"): its cross shows the open issues alone from "Open and fixed", and both
 * groups from the other two. There the cross of the page's own lesson or course leads to plain Issues.
 */
export function issuesChipsOf(view: IssuesView, names: IssuesNames = {}, at: IssuesAt = 'issues'): IssuesChip[] {
  const chips: IssuesChip[] = [];
  const own = isOwnView(view, at);
  if (own) {
    chips.push({
      key: 'show',
      label: SHOW_CHIP_LABELS[view.show],
      removeHref: issuesHrefOf({ ...view, show: view.show === 'both' ? 'open' : 'both' }, at),
    });
  }
  // The chip of the page's own lesson or course leads to plain Issues: the rest of the view is the page's own.
  const leave = (key: 'lesson' | 'course', without: IssuesView) =>
    own && at === key ? LEARN_ISSUES_PATH : issuesHrefOf(without, at);
  if (view.course) {
    chips.push({
      key: 'course',
      label: `Course: ${names.course ?? view.course}`,
      removeHref: leave('course', { ...view, course: null }),
    });
  }
  if (view.lesson) {
    chips.push({
      key: 'lesson',
      label: `Lesson: ${names.lesson ?? view.lesson}`,
      removeHref: leave('lesson', { ...view, lesson: null }),
    });
  }
  if (view.repo) {
    chips.push({
      key: 'repo',
      label: `Repository: ${view.repo}`,
      removeHref: issuesHrefOf({ ...view, repo: null }, at),
    });
  } else if (view.org) {
    chips.push({ key: 'org', label: `Org: ${view.org}`, removeHref: issuesHrefOf({ ...view, org: null }, at) });
  }
  if (view.language) {
    chips.push({
      key: 'language',
      label: `Language: ${languageNameOf(view.language)}`,
      removeHref: issuesHrefOf({ ...view, language: null }, at),
    });
  }
  if (!own && view.show === 'fixed') {
    chips.push({ key: 'fixed', label: 'Fixed', removeHref: issuesHrefOf({ ...view, show: 'open' }, at) });
  }
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
  /**
   * How many issues the list holds once it is pressed; null for none. A pressed switch has none: the API counts only
   * the list with a switch flipped, and for a pressed one that is the list with it turned off, not the list it gives.
   */
  count: string | null;
  /** The view once it is pressed. */
  href: Route;
};

export const FOR_YOU_LABEL = 'For you';
export const LEARNED_LABEL = 'Lessons I learned';

/** The two switches of a signed-in person's list; one that is off carries the count the API gives for it pressed. */
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
      count: view.forYou ? null : issuesCountTextOf(list?.forYouCount),
      href: issuesHrefOf({ ...view, forYou: !view.forYou }, at),
    },
    {
      key: 'learned',
      label: LEARNED_LABEL,
      on: view.learned,
      count: view.learned ? null : issuesCountTextOf(list?.learnedCount),
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

/** "for this lesson", "in this course", "in this project", "in Go": what a view narrows to, in a sentence. */
function scopeWordsOf(view: IssuesView): string {
  if (view.lesson) return 'for this lesson';
  if (view.course) return 'in this course';
  if (view.repo) return 'in this project';
  if (view.org) return 'in the projects of this org';
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
    lessonIssues: typeof raw.lessonIssues === 'boolean' ? raw.lessonIssues : null,
    lessonIssuesCovered: typeof raw.lessonIssuesCovered === 'boolean' ? raw.lessonIssuesCovered : null,
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
  repo: view.repo,
  org: view.org,
});

/**
 * Issues' fixed view as some links spell it, `show=fixed`, at `/learn/issues`: the same view at its one address, with
 * `show` dropped and `fixed=1` set; null for any other address, and for a query without it.
 */
export function issuesShowFixedRedirectOf(pathname: string, search: string): string | null {
  if (pathname !== LEARN_ISSUES_PATH) return null;
  const query = new URLSearchParams(search);
  if (query.get('show') !== 'fixed') return null;
  query.delete('show');
  query.set('fixed', '1');
  return `${LEARN_ISSUES_PATH}?${queryText(query)}`;
}

export const issuesInputOf = (view: IssuesView) => ({
  ...issuesPublicInputOf(view),
  forYou: view.forYou,
  learned: view.learned,
});
