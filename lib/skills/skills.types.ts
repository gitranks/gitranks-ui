import type { LearnCourseCard, LearnCourseKind } from '@/lib/learn/course';
import type { LearnDepth, LearnLessonLevel } from '@/lib/learn/lesson-page';
import type { IssueNumbers } from '@/lib/workspace/masked-issue.types';
import type { LearnFixMade, LearnIssueLesson } from '@/lib/workspace/pull-request-page.types';

/**
 * A person's Skills page as the GitRanks GraphQL API answers it: what they proved with GitRanks Contribute and
 * GitRanks Learn. The parts in `components/skills/` draw it from this data alone.
 */

/** Which kind of person the page is about, read from what it shows. */
export type SkillsKind = 'CONTRIBUTOR' | 'LEARNER' | 'BOTH';

/** Where a page stands, for everyone else and for its owner. */
export type SkillsState = 'NEW' | 'NOTHING_YET' | 'PUBLIC' | 'HIDDEN' | 'PRIVATE';

export type SkillsFigureKey =
  | 'FIXES_MERGED'
  | 'PULL_REQUESTS_OPEN'
  | 'LESSONS_LEARNED'
  | 'PRACTISED'
  | 'MASTERED'
  | 'DAYS_ACTIVE'
  | 'HELPED'
  | 'AGENT';

/**
 * One number of the row. `value` is null for the agent, whose `name` is the agent and `also` the second one; `second`
 * is the number worded after it (the projects of the fixes, the courses of the lessons).
 */
export type SkillsFigure = {
  key: SkillsFigureKey;
  value: number | null;
  second: number | null;
  name: string | null;
  also: string | null;
};

/**
 * The numbers box: the tab's row (`figures`), the block's and the card's (`blockFigures`), when the person started
 * (`since`), the languages of their fixes, and how many fixes and courses the tab lists.
 */
export type SkillsNumbers = {
  kind: SkillsKind;
  figures: SkillsFigure[];
  blockFigures: SkillsFigure[];
  since: string;
  languages: string[];
  fixes: number;
  courses: number;
  /** The products that made the listed fixes. */
  made: LearnFixMade[];
};

/** Where a fix stands. A closed pull request is never listed. */
export type LearnFixState = 'OPEN' | 'MERGED' | 'CLOSED';

/** One fix in a real project. `page` is false for a fix whose public page was hidden: it keeps its GitHub links only. */
export type SkillsFix = {
  repo: string;
  issueNumber: number;
  issueUrl: string;
  number: number;
  url: string;
  language: string | null;
  title: string;
  made: LearnFixMade;
  state: LearnFixState;
  mergedAt: string | null;
  lesson: LearnIssueLesson | null;
  page: boolean;
};

export type SkillsFixes = { rows: SkillsFix[]; total: number; next: string | null };

/** A lesson's square: its depth, and whether a merged fix of the person used it (the star). */
export type SkillsLesson = {
  slug: string;
  title: string;
  level: LearnLessonLevel;
  depth: LearnDepth;
  fix: boolean;
};

/** A group the person started: how many of its lessons they learned, and every live lesson in order. */
export type SkillsGroup = { slug: string; name: string; learned: number; lessons: SkillsLesson[] };

/** The kinds of course, a project's two among them. */
export type SkillsCourseKind = LearnCourseKind | 'REPOSITORY' | 'ORG';

/** A course as the Skills page lists it. */
export type SkillsCourseCard = Omit<LearnCourseCard, 'kind'> & { kind: SkillsCourseKind };

/** One course card: the counts by depth, when it was finished, the groups started and the names of the others. */
export type SkillsCourse = {
  course: SkillsCourseCard;
  learned: number;
  practised: number;
  mastered: number;
  finishedAt: string | null;
  groups: SkillsGroup[];
  notStarted: string[];
};

/** The public page. */
export type SkillsPage = {
  login: string;
  numbers: SkillsNumbers;
  fixes: SkillsFixes;
  courses: SkillsCourse[];
  indexable: boolean;
};

/** The numbers alone, for the block and the tab. */
export type SkillsBrief = { login: string; numbers: SkillsNumbers };

/** The night's numbers of the list of issues, with the two the Skills page adds: each null until counted. */
export type SkillsIssueNumbers = IssueNumbers & { repos: number | null; aiReadsPerDay: number | null };

/** The owner's own view of their page, whatever its state. */
export type SkillsMine = {
  state: SkillsState;
  page: SkillsPage | null;
  usesContribute: boolean;
  usesLearn: boolean;
  /** Whether Learn is open to this person: Learn's boxes and links show only then. */
  learnOpen: boolean;
  /** The tab's "New" mark, until the first visit. */
  tabNew: boolean;
  numbers: SkillsIssueNumbers | null;
};
