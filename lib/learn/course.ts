import { languageNameOf } from './learn-question';
import type { LearnCourseGroup, LearnDepth, LearnGroupLesson, LearnLessonLevel, LearnLessonLink } from './lesson-page';
import { SETUP_LANGUAGES } from './setup';

/*
 * A course and the list of courses, as everyone reads them and as a learner's own side marks them: the rules the pages
 * of all courses and of a course draw, pure, so the pages, the copies and the specs agree.
 */

/**
 * A topic course works in any language; a language course is about one (or JavaScript and TypeScript together); a
 * project course is about one repository or one organisation, written by GitRanks from the project's docs and code.
 */
export type LearnCourseKind = 'TOPIC' | 'LANGUAGE' | 'REPOSITORY' | 'ORG';

/**
 * The project a project course is about: its name on the page, its repository (`owner/name`) or its organisation, both
 * lower case, its main language, its GitHub address, whether GitRanks has a page for it, the short names of an
 * organisation's covered repositories (none for a repository's course), and the day it was last checked against the
 * code (`YYYY-MM-DD`).
 */
export type LearnCourseProject = {
  name: string;
  repo: string | null;
  org: string | null;
  language: string;
  githubUrl: string;
  onGitranks: boolean;
  covers: string[];
  checkedAt: string;
};

/**
 * A course's public numbers: each null until it is worth showing. `issuesFixed`, the merged fixes that used a lesson
 * of the course, is read by the course's own page and picture alone (null under 5).
 */
export type LearnCourseNumbers = { learners: number | null; goodShare: number | null; issuesFixed?: number | null };

/** A course as the list shows it. */
export type LearnCourseCard = {
  slug: string;
  name: string;
  kind: LearnCourseKind;
  covers: string;
  languages: string[];
  lessons: number;
  numbers: LearnCourseNumbers;
  /** The project of a project course; null or absent for a topic or a language course. */
  project?: LearnCourseProject | null;
};

/** A course whole: its groups of lessons in order, and the course to take after it. */
export type LearnCourse = LearnCourseCard & {
  about: string;
  groups: LearnCourseGroup[];
  next: LearnCourseCard | null;
  checkOffered: boolean;
  changedAt: string;
};

/** A lesson as the list of every lesson gives it, for the search of all courses. */
export type LearnLessonListItem = {
  slug: string;
  title: string;
  level: LearnLessonLevel;
  course: LearnLessonLink;
  group: LearnLessonLink;
  paused: boolean;
  changedAt: string;
};

/**
 * Whether a live lesson has a listed merged fix, for the sitemap: null when the API could not say, and then its view is
 * left out.
 */
export type LearnLessonFixesListed = {
  slug: string;
  course: { slug: string };
  paused: boolean;
  fixesListed: boolean | null;
};

/** A lesson of the learner's side of a course. */
export type LearnCourseLessonMine = { slug: string; depth: LearnDepth; known: boolean; due: boolean };

/** Where the learner's check of a course stands. */
export type LearnCheckProgress = 'NONE' | 'UNFINISHED' | 'ENDED' | 'SAVED';

/** The learner's side of a course. `learned` counts every depth; `known`, the lessons marked and not learned. */
export type LearnCourseMine = {
  slug: string;
  learned: number;
  practised: number;
  mastered: number;
  known: number;
  due: number;
  lessons: LearnCourseLessonMine[];
  next: LearnLessonLink | null;
  check: { state: LearnCheckProgress; left: number };
  finishedAt: string | null;
  feedbackGood: boolean | null;
};

/** The learner's side of a course in the list. */
export type LearnCourseMineCard = Pick<
  LearnCourseMine,
  'learned' | 'practised' | 'mastered' | 'known' | 'due' | 'next' | 'finishedAt'
> & { course: LearnCourseCard };

const NUMBER = new Intl.NumberFormat('en-US');

/** A count as the pages write it: "1,240". */
export const countWords = (count: number) => NUMBER.format(count);

/** A course's learners are shown from this many: fewer is not worth showing. */
export const LEARNERS_SHOWN_FROM = 10;

/** The course's learners, the people who started it, when worth showing: from 10. */
export function learnersOf(numbers: LearnCourseNumbers): number | null {
  const { learners } = numbers;
  return learners !== null && Number.isInteger(learners) && learners >= LEARNERS_SHOWN_FROM ? learners : null;
}

/** "1,240 learners". */
export const learnersWords = (learners: number) => `${countWords(learners)} learners`;

/** The share who rate the course good, in percent, when the API gives it. */
export function goodShareOf(numbers: LearnCourseNumbers): number | null {
  const { goodShare } = numbers;
  return goodShare !== null && Number.isInteger(goodShare) && goodShare >= 0 && goodShare <= 100 ? goodShare : null;
}

/** "94% rate it good". */
export const goodShareWords = (share: number) => `${share}% rate it good`;

/** "86 lessons", "1 lesson". */
export const lessonsWords = (count: number) => `${countWords(count)} ${count === 1 ? 'lesson' : 'lessons'}`;

/** The pill under a course's title. */
export const COURSE_KIND_LABELS: Record<LearnCourseKind, string> = {
  TOPIC: 'Topic course',
  LANGUAGE: 'Language course',
  REPOSITORY: 'Repository course',
  ORG: 'Org course',
};

/** The words a search finds a kind of course by. */
const KIND_WORDS: Record<LearnCourseKind, string> = {
  TOPIC: 'topic',
  LANGUAGE: 'language',
  REPOSITORY: 'repository project',
  ORG: 'org organisation project',
};

/** "86 lessons in 9 groups. Each one takes about two minutes." */
export function courseCountLineOf(course: Pick<LearnCourse, 'lessons' | 'groups'>): string {
  const groups = course.groups.length;
  return `${lessonsWords(course.lessons)} in ${countWords(groups)} ${groups === 1 ? 'group' : 'groups'}. Each one takes about two minutes.`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* A lesson's square                                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

/** What a lesson's square says: its depth, marked as known, the next one, or paused. */
export type CourseSquareKind = 'none' | 'known' | 'learned' | 'practised' | 'mastered' | 'next' | 'paused';

/**
 * A lesson's square: what it is, and whether the review asks it now. A paused lesson the learner had learned keeps
 * its depth, with `paused` set; one they had not is `paused` as its kind.
 */
export type CourseSquare = { kind: CourseSquareKind; due: boolean; paused?: boolean };

/** Whether a square's lesson is paused: it is not a link, and it is not found or asked until it is back. */
export const isPausedSquare = (square: CourseSquare) => square.kind === 'paused' || !!square.paused;

const SQUARE_OF_DEPTH: Record<LearnDepth, CourseSquareKind> = {
  NONE: 'none',
  LEARNED: 'learned',
  PRACTISED: 'practised',
  MASTERED: 'mastered',
};

/** A learner's side of a course by lesson. */
export const mineBySlugOf = (mine: Pick<LearnCourseMine, 'lessons'> | null) =>
  new Map((mine?.lessons ?? []).map((lesson) => [lesson.slug, lesson]));

/**
 * A lesson's square: its depth, or its mark as known, kept while the lesson is paused (progress on it is kept); a
 * paused lesson with nothing on it says Paused; a lesson not learned is the next one, or marked as known, or not
 * started. Due only once learned and live.
 */
export function courseSquareOf(
  lesson: Pick<LearnGroupLesson, 'slug' | 'paused'>,
  mine: LearnCourseLessonMine | undefined,
  next: string | null,
): CourseSquare {
  const depth = mine?.depth ?? 'NONE';
  if (lesson.paused) {
    if (depth !== 'NONE') return { kind: SQUARE_OF_DEPTH[depth], due: false, paused: true };
    return mine?.known ? { kind: 'known', due: false, paused: true } : { kind: 'paused', due: false };
  }
  if (depth !== 'NONE') return { kind: SQUARE_OF_DEPTH[depth], due: !!mine?.due };
  if (lesson.slug === next) return { kind: 'next', due: false };
  return { kind: mine?.known ? 'known' : 'none', due: false };
}

/** A square's state in words, as its card and its label say it. */
export const SQUARE_WORDS: Record<CourseSquareKind, string> = {
  none: 'Not started',
  next: 'Not started',
  known: 'Marked as known, not answered',
  learned: 'Learned',
  practised: 'Practised',
  mastered: 'Mastered',
  paused: 'Paused',
};

/** A square's label: "<title> · <state>[ · paused][ · due now]"; the next lesson says so. */
export function squareLabelOf(title: string, square: CourseSquare): string {
  const state =
    square.kind === 'known'
      ? 'marked as known'
      : square.kind === 'next'
        ? 'next, not started'
        : SQUARE_WORDS[square.kind];
  return `${title} · ${state}${square.paused ? ' · paused' : ''}${square.due ? ' · due now' : ''}`;
}

/** What clicking a square does, as its card says. */
export function squareHintOf(square: CourseSquare): string | null {
  if (square.paused) return null;
  switch (square.kind) {
    case 'paused':
      return null;
    case 'none':
    case 'next':
      return 'Click to start the lesson';
    case 'known':
      return 'Click to learn the lesson';
    default:
      return 'Click to open the lesson';
  }
}

/** The words of a level. */
export const LEVEL_WORDS: Record<LearnLessonLevel, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/* ------------------------------------------------------------------------------------------------------------------ */
/* A group's count, and the course's line                                                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * How a learner stands in a group: learned at any depth and marked as known, paused lessons too (progress on them is
 * kept); done when every lesson that is not paused is learned.
 */
export function groupStandingOf(group: LearnCourseGroup, mine: Map<string, LearnCourseLessonMine>) {
  let learned = 0;
  let known = 0;
  for (const lesson of group.lessons) {
    const own = mine.get(lesson.slug);
    if (own && own.depth !== 'NONE') learned += 1;
    else if (own?.known) known += 1;
  }
  const count = group.lessons.length;
  const live = group.lessons.filter((lesson) => !lesson.paused);
  const done = live.length > 0 && live.every((lesson) => (mine.get(lesson.slug)?.depth ?? 'NONE') !== 'NONE');
  return { learned, known, count, done };
}

/** One part of a line of counts: a number in the mono face, then its words; or words alone. */
export type CountPart = { count: number | null; words: string };

/** A group's head in the list: "4 of 8 learned", "· 7 marked as known", or "8 lessons". Never a zero. */
export function groupHeadOf(standing: ReturnType<typeof groupStandingOf>): CountPart[] {
  const parts: CountPart[] = [
    standing.learned > 0
      ? { count: standing.learned, words: ` of ${countWords(standing.count)} learned` }
      : { count: null, words: lessonsWords(standing.count) },
  ];
  if (standing.known > 0) parts.push({ count: standing.known, words: ' marked as known' });
  return parts;
}

/** A group's count in the Squares view: "4 of 8", or "8 lessons". */
export const groupSquaresCountOf = (standing: ReturnType<typeof groupStandingOf>): CountPart =>
  standing.learned > 0
    ? { count: standing.learned, words: ` of ${countWords(standing.count)}` }
    : { count: null, words: lessonsWords(standing.count) };

/**
 * Whether a learner finished a course: the API stamped it, or every lesson that is not paused is learned (a lesson
 * paused before they reached it never stamps it). The boxes and the line under the title both ask this.
 */
export function courseFinishedOf(
  course: Pick<LearnCourse, 'groups'>,
  mine: Pick<LearnCourseMine, 'finishedAt' | 'lessons'>,
): boolean {
  if (mine.finishedAt !== null) return true;
  const own = mineBySlugOf(mine);
  const live = course.groups.flatMap((group) => group.lessons).filter((lesson) => !lesson.paused);
  return live.length > 0 && live.every((lesson) => (own.get(lesson.slug)?.depth ?? 'NONE') !== 'NONE');
}

/**
 * The line under a learner's course title: learned, practised, mastered, each only when there is one; then the door
 * to the check, as the number marked as known or the offer to mark some (while the course is not finished). Null when
 * nothing is learned or marked: the course's own count line stays.
 */
export function courseProgressLineOf(
  mine: Pick<LearnCourseMine, 'learned' | 'practised' | 'mastered' | 'known' | 'finishedAt' | 'lessons'>,
  course: Pick<LearnCourse, 'groups' | 'lessons' | 'checkOffered'>,
): { parts: CountPart[]; check: string | null } | null {
  if (mine.learned <= 0 && mine.known <= 0) return null;
  const parts: CountPart[] = [];
  if (mine.learned > 0) parts.push({ count: mine.learned, words: ` of ${countWords(course.lessons)} learned` });
  if (mine.practised > 0) parts.push({ count: mine.practised, words: ' practised' });
  if (mine.mastered > 0) parts.push({ count: mine.mastered, words: ' mastered' });
  const check =
    mine.known > 0
      ? `${countWords(mine.known)} marked as known`
      : course.checkOffered && !courseFinishedOf(course, mine)
        ? 'Mark lessons you already know'
        : null;
  return { parts, check };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The three boxes                                                                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The first box: where to start or go on, the course finished, or why nothing new is left. */
export type CourseFirstBox =
  | { kind: 'start'; lesson: LearnLessonLink; group: string }
  | { kind: 'next'; lesson: LearnLessonLink; group: string; why: string; finishedGroup: string | null }
  | { kind: 'finished'; learned: number; lessons: number; pausedLeft: number; rated: boolean | null }
  /** Every lesson left is marked as known: the first of them, to learn it by answering. */
  | { kind: 'known-left'; lesson: LearnLessonLink; group: string; known: number }
  /** Every lesson left is paused: they come back once corrected. */
  | { kind: 'paused-left'; paused: number };

/** The middle box: the check in its states, the review, or what the learner marked as known. */
export type CourseMiddleBox =
  | { kind: 'check-sign-in' }
  | { kind: 'check' }
  | { kind: 'check-unfinished'; left: number }
  | { kind: 'check-ended' }
  | { kind: 'known'; known: number }
  | { kind: 'due'; due: number }
  | { kind: 'review-none' }
  | { kind: 'grows' };

/**
 * The last box: how a lesson grows, signing in, where to go after the course, or the open issues of the learner's list
 * for lessons of the course, which take its place while there are some.
 */
export type CourseLastBox =
  | { kind: 'grows' }
  | { kind: 'sign-in' }
  | {
      kind: 'further';
      next: LearnCourseCard | null;
      /** The open issues of the learner's list for lessons of the course: "Fix a real issue" among the ways on. */
      issues?: number;
    }
  | { kind: 'issues'; count: number };

/**
 * Who is looking at a course with no side of theirs: a visitor (no session), a person with a session whose side is on
 * its way (`pending`), or whose side did not come (`session`: a failed read, or Learn not open to them yet).
 */
export type CoursePerson = 'visitor' | 'pending' | 'session';

/** The three boxes, and which one is highlighted (it takes Enter). */
export type CourseBoxes = {
  first: CourseFirstBox;
  middle: CourseMiddleBox;
  last: CourseLastBox;
  highlight: 'first' | 'middle' | 'last' | null;
};

/** Where a lesson sits: its group and its place in it. */
function placeOf(course: Pick<LearnCourse, 'groups'>, slug: string) {
  for (const [groupIndex, group] of course.groups.entries()) {
    const index = group.lessons.findIndex((lesson) => lesson.slug === slug);
    if (index >= 0) return { group, groupIndex, index };
  }
  return null;
}

/** The first lesson, in course order, that passes a test, with its group's name. */
function firstLessonWhere(course: Pick<LearnCourse, 'groups'>, test: (lesson: LearnGroupLesson) => boolean) {
  for (const group of course.groups) {
    const lesson = group.lessons.find(test);
    if (lesson) return { lesson: { slug: lesson.slug, title: lesson.title }, group: group.name };
  }
  return null;
}

/** The first lesson of the course that is not paused. */
const firstLessonOf = (course: Pick<LearnCourse, 'groups'>) => firstLessonWhere(course, (lesson) => !lesson.paused);

/**
 * Why the next lesson is next, in a few words after its group: the first the learner does not know yet, the first of
 * the course, the first of the next group (and the group just finished), or the next in its group. Paused lessons do
 * not count: the first lesson a learner can take is the first.
 */
function nextWhyOf(course: Pick<LearnCourse, 'groups'>, mine: LearnCourseMine, slug: string) {
  const place = placeOf(course, slug);
  if (!place) return { why: 'the next lesson of this course.', finishedGroup: null };
  const own = mineBySlugOf(mine);
  if (mine.learned <= 0 && mine.known > 0) return { why: 'the first lesson you do not know yet.', finishedGroup: null };
  if (firstLessonOf(course)?.lesson.slug === slug)
    return { why: 'the first lesson of this course.', finishedGroup: null };
  if (place.group.lessons.find((lesson) => !lesson.paused)?.slug === slug) {
    const before = course.groups
      .slice(0, place.groupIndex)
      .reverse()
      .find((group) => group.lessons.some((lesson) => !lesson.paused));
    const finished = before && groupStandingOf(before, own).done ? before.name : null;
    return { why: 'the first lesson of the next group.', finishedGroup: finished };
  }
  return { why: 'the next lesson in its group.', finishedGroup: null };
}

/**
 * The first box of a learner with no next lesson: the course finished (`courseFinishedOf`), or else every lesson left
 * is marked as known (the first of them is offered, to learn it by answering), or paused.
 */
function nothingNextOf(course: Pick<LearnCourse, 'groups' | 'lessons'>, mine: LearnCourseMine): CourseFirstBox {
  const own = mineBySlugOf(mine);
  const unlearned = (lesson: LearnGroupLesson) => (own.get(lesson.slug)?.depth ?? 'NONE') === 'NONE';
  const lessons = course.groups.flatMap((group) => group.lessons);
  const pausedLeft = lessons.filter((lesson) => lesson.paused && unlearned(lesson)).length;
  const known = firstLessonWhere(
    course,
    (lesson) => !lesson.paused && unlearned(lesson) && !!own.get(lesson.slug)?.known,
  );
  if (courseFinishedOf(course, mine))
    return { kind: 'finished', learned: mine.learned, lessons: course.lessons, pausedLeft, rated: mine.feedbackGood };
  if (known) return { kind: 'known-left', ...known, known: mine.known };
  return { kind: 'paused-left', paused: pausedLeft };
}

/**
 * The three boxes of a course's page. A visitor: the first lesson, the check behind signing in, and signing
 * in highlighted. A person with a session and no side: the same without signing in, nothing lit while the side is on
 * its way. A learner: the next lesson, or the course finished, or why nothing new is left; the middle box is
 * the review while lessons are due, else the check in its state, else what they marked; the last box says how a
 * lesson grows, or, the course finished, where to go next. `checkFirst`: the check takes the highlight and Enter (a
 * course not started, for an experienced developer). A box with nothing to press never takes the highlight: a finished
 * course lights the review while lessons are due, and no box otherwise.
 */
export function courseBoxesOf(
  course: Pick<LearnCourse, 'groups' | 'lessons' | 'checkOffered' | 'next'>,
  mine: LearnCourseMine | null,
  {
    checkFirst = false,
    person = 'visitor',
    openIssues = null,
  }: {
    checkFirst?: boolean;
    person?: CoursePerson;
    /** The open issues of the learner's list for lessons of the course; none leaves the box as it was. */
    openIssues?: number | null;
  } = {},
): CourseBoxes {
  const first = firstLessonOf(course);
  const start: CourseFirstBox = first ? { kind: 'start', ...first } : { kind: 'paused-left', paused: course.lessons };
  if (!mine && person === 'visitor') {
    return {
      first: start,
      middle: course.checkOffered ? { kind: 'check-sign-in' } : { kind: 'grows' },
      last: { kind: 'sign-in' },
      highlight: 'last',
    };
  }
  if (!mine) {
    // A session with no side yet, or none to come: never asked to sign in again. Nothing is lit while the side is on
    // its way, so nothing flashes; with none to come, the first lesson takes Enter.
    const middle: CourseMiddleBox = course.checkOffered ? { kind: 'check' } : { kind: 'grows' };
    return {
      first: start,
      middle,
      last: middle.kind === 'check' ? { kind: 'grows' } : { kind: 'further', next: course.next },
      highlight: person === 'session' && start.kind === 'start' ? 'first' : null,
    };
  }

  let firstBox: CourseFirstBox;
  if (mine.next) {
    const place = placeOf(course, mine.next.slug);
    firstBox = {
      kind: 'next',
      lesson: mine.next,
      group: place?.group.name ?? '',
      ...nextWhyOf(course, mine, mine.next.slug),
    };
  } else firstBox = nothingNextOf(course, mine);

  let middle: CourseMiddleBox;
  if (mine.due > 0) middle = { kind: 'due', due: mine.due };
  else if (mine.check.state === 'UNFINISHED' && course.checkOffered && checkAnsweredOf(course, mine)) {
    middle = { kind: 'check-unfinished', left: mine.check.left };
  } else if (mine.check.state === 'ENDED' && course.checkOffered) middle = { kind: 'check-ended' };
  else if (mine.learned > 0) middle = { kind: 'review-none' };
  else if (mine.known > 0) middle = { kind: 'known', known: mine.known };
  else if (course.checkOffered) middle = { kind: 'check' };
  else middle = { kind: 'review-none' };

  const issues = typeof openIssues === 'number' && openIssues > 0 ? Math.floor(openIssues) : 0;
  // The open issues take the place of how a lesson grows; a finished course keeps where to go next, which names them.
  const last: CourseLastBox =
    firstBox.kind === 'finished'
      ? { kind: 'further', next: course.next, ...(issues ? { issues } : {}) }
      : issues
        ? { kind: 'issues', count: issues }
        : { kind: 'grows' };
  // A check only opened leads as a run does: the person was sent to it (an experienced developer's setup), and the
  // route reads `checkFirst` only for a course with no run at all.
  const checkOpened = middle.kind === 'check' && mine.check.state === 'UNFINISHED';
  const checkLeads =
    (middle.kind === 'check' && (checkFirst || checkOpened)) ||
    middle.kind === 'check-unfinished' ||
    middle.kind === 'check-ended';
  const middleActs = middle.kind !== 'review-none';
  const highlight = checkLeads
    ? 'middle'
    : firstBox.kind === 'finished'
      ? middle.kind === 'due'
        ? 'middle'
        : null
      : firstBox.kind !== 'paused-left'
        ? 'first'
        : middleActs
          ? 'middle'
          : null;
  return { first: firstBox, middle, last, highlight };
}

/** The level of an experienced developer: the highest of the three a learner sets up. */
export const EXPERIENCED_LEVEL = 3;

/**
 * Whether the learner may have answered a question of their unfinished check. The check asks one question for each
 * group, and its questions left count only the groups still in the course: exactly as many left as the course has
 * groups means none is answered yet, only opened, and the page offers the check as if no run existed. Any other count
 * (fewer, or more when the course read is older than the run) keeps "Finish the check", so no answer is ever hidden.
 */
export const checkAnsweredOf = (course: Pick<LearnCourse, 'groups'>, mine: Pick<LearnCourseMine, 'check'>) =>
  mine.check.state === 'UNFINISHED' && mine.check.left !== course.groups.length;

/** A course not started: nothing learned, nothing marked as known, and no check begun. */
export const courseNotStartedOf = (mine: Pick<LearnCourseMine, 'learned' | 'known' | 'check'>) =>
  mine.learned <= 0 && mine.known <= 0 && mine.check.state === 'NONE';

/**
 * Whether the check leads a course's page (`courseBoxesOf`'s `checkFirst`): a course not started, for a learner whose
 * level, set up or guessed, is an experienced developer's. Everyone else starts at the first lesson.
 */
export const checkFirstOf = (mine: Pick<LearnCourseMine, 'learned' | 'known' | 'check'>, level: number | null) =>
  courseNotStartedOf(mine) && level === EXPERIENCED_LEVEL;

/** "4 lessons to repeat". */
export const toRepeatWords = (due: number) => `${countWords(due)} ${due === 1 ? 'lesson' : 'lessons'} to repeat`;

/** About how long a review of so many lessons takes: three quarters of a minute each, one minute at least. */
export function reviewMinutesWords(due: number): string {
  const minutes = Math.max(1, Math.round(due * 0.75));
  return `About ${minutes === 1 ? 'a minute' : `${countWords(minutes)} minutes`}.`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Filters and the search of a course                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The filter chips of a course's page. */
export type CourseFilter = 'all' | 'to-learn' | 'due';

/** Whether a lesson's square passes a filter. To learn: not learned and not marked as known. */
export function passesFilter(square: CourseSquare, filter: CourseFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'to-learn':
      return square.kind === 'none' || square.kind === 'next';
    case 'due':
      return square.due;
  }
}

/** How many lessons each filter keeps, among the lessons a search found. */
export function filterCountsOf(
  lessons: readonly LearnGroupLesson[],
  squareOf: (lesson: LearnGroupLesson) => CourseSquare,
): Record<CourseFilter, number> {
  const counts: Record<CourseFilter, number> = { all: 0, 'to-learn': 0, due: 0 };
  for (const lesson of lessons) {
    const square = squareOf(lesson);
    for (const filter of ['all', 'to-learn', 'due'] as const) if (passesFilter(square, filter)) counts[filter] += 1;
  }
  return counts;
}

/** What a key does on a course's page and on all courses: "/" finds, Esc clears, Enter takes the lit box, R reviews. */
export type CoursePageKey = 'find' | 'clear' | 'enter' | 'review';

/**
 * A key's action by where it was pressed: nothing while typing in a field (the field takes its own Esc); Enter only
 * on the page itself, since on a button or a link it is that control's own press.
 */
export function coursePageKeyOf(key: string, where: 'field' | 'control' | 'page'): CoursePageKey | null {
  if (where === 'field') return null;
  if (key === '/') return 'find';
  if (key === 'Escape') return 'clear';
  if (key === 'Enter') return where === 'page' ? 'enter' : null;
  if (key === 'r' || key === 'R') return 'review';
  return null;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The typed words of a search, trimmed and with single spaces; empty for nothing typed. */
export const searchQueryOf = (raw: string | null | undefined) => (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);

const MARK = /\p{M}/u;

/**
 * A text with its accents dropped, whatever its Unicode form, and where each letter left came from: "Résumé" and
 * "Résumé" both fold to "Resume". `from[i]` is the index in the text of the folded letter `i`.
 */
export function foldedOf(text: string): { folded: string; from: number[] } {
  let folded = '';
  const from: number[] = [];
  let index = 0;
  for (const char of text) {
    for (const part of char.normalize('NFD')) {
      if (MARK.test(part)) continue;
      folded += part;
      for (let unit = 0; unit < part.length; unit += 1) from.push(index);
    }
    index += char.length;
  }
  return { folded, from };
}

/**
 * Where the typed letters start a word of the text: case and accents do not matter ("resume" finds "Résumé"), and
 * "go" finds Go and goroutines but not "Algorithms". The match is given in the text's own indexes, its accents
 * inside it. Null when the letters start no word.
 */
export function wordStartMatchOf(text: string, query: string): { start: number; end: number } | null {
  const q = foldedOf(searchQueryOf(query)).folded;
  if (!q) return null;
  const { folded, from } = foldedOf(text);
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(q)})`, 'iu').exec(folded);
  if (!match) return null;
  const at = match.index + match[1].length;
  const last = at + match[2].length - 1;
  const start = from[at];
  // The end takes the whole last letter, and the accents after it.
  let end = from[last] + 1;
  while (end < text.length && (text.charCodeAt(end) & 0xfc00) === 0xdc00) end += 1;
  while (end < text.length && MARK.test(text[end])) end += 1;
  return { start, end };
}

/** A text cut where a search matched, so the match can be marked. */
export type MarkedText = { before: string; mark: string; after: string } | { text: string };

/** A text with its first match marked, or as it is. */
export function markedTextOf(text: string, query: string): MarkedText {
  const match = wordStartMatchOf(text, query);
  return match
    ? { before: text.slice(0, match.start), mark: text.slice(match.start, match.end), after: text.slice(match.end) }
    : { text };
}

/** A group as a course's search shows it: matched by its name (every lesson shows) or by some lessons' titles. */
export type CourseSearchGroup = { group: LearnCourseGroup; byName: boolean; lessons: LearnGroupLesson[] };

/**
 * A course's search: the groups whose name matches, whole (a paused lesson keeps its place there), then each group's
 * lessons whose title matches, paused ones never; in order.
 */
export function courseSearchOf(groups: readonly LearnCourseGroup[], query: string): CourseSearchGroup[] {
  const q = searchQueryOf(query);
  if (!q) return groups.map((group) => ({ group, byName: false, lessons: group.lessons }));
  return groups.flatMap((group): CourseSearchGroup[] => {
    if (wordStartMatchOf(group.name, q)) return [{ group, byName: true, lessons: group.lessons }];
    const lessons = group.lessons.filter((lesson) => !lesson.paused && wordStartMatchOf(lesson.title, q));
    return lessons.length ? [{ group, byName: false, lessons }] : [];
  });
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* All courses                                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The sections of all courses: topics, languages, and the courses about one project. */
export type CourseSectionKind = 'TOPIC' | 'LANGUAGE' | 'PROJECT';

/** A section of all courses: one kind, or the project courses of both kinds together. */
export type CourseSection = { kind: CourseSectionKind; title: string; sub: string; courses: LearnCourseCard[] };

/** Whether a course is about one project: a repository's or an organisation's. */
export const isProjectCourse = (course: Partial<Pick<LearnCourseCard, 'kind'>>): boolean =>
  course.kind === 'REPOSITORY' || course.kind === 'ORG';

/** The title and the line of the section of project courses. */
export const PROJECT_SECTION = {
  title: 'Projects, from the inside',
  sub: 'For people who want to contribute to them.',
};

/** "all seven languages" for Learn's seven; the names for any other list ("Python and JavaScript", "Shell"). */
const examplesInWords = (languages: readonly string[], all = 'all ') =>
  languages.length === SETUP_LANGUAGES.length && SETUP_LANGUAGES.every((language) => languages.includes(language))
    ? `${all}seven languages`
    : languageListOf(languages);

/** "Python", "Python and JavaScript", "Python, JavaScript and Go". */
const languageListOf = (languages: readonly string[]) => {
  const names = languages.map(languageNameOf);
  return names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(' and ');
};

/**
 * The line under the topic courses, from their own languages: one way when they all share it ("Every example comes in
 * all seven languages."), else the most common way in a sentence of its own, "Most" when it is over half of them,
 * then the others, ties in the API's order ("Most courses show their examples in seven languages. Others use Python
 * and JavaScript, or Shell."). The same languages in another order are one way. A course that lists no
 * languages is left out of the line.
 */
export function topicLanguagesLineOf(topics: readonly Pick<LearnCourseCard, 'languages'>[]): string {
  const counts = new Map<string, { languages: readonly string[]; count: number }>();
  for (const { languages } of topics) {
    if (!languages.length) continue;
    const key = [...languages].sort().join(',');
    const seen = counts.get(key);
    counts.set(key, { languages: seen?.languages ?? languages, count: (seen?.count ?? 0) + 1 });
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  if (!sorted.length) return 'Each one works in any language.';
  if (sorted.length === 1) return `Every example comes in ${examplesInWords(sorted[0].languages)}.`;
  // ", or " between the other ways, so two sets never run together; "Most" counts every topic course.
  const ways = sorted.map((way) => examplesInWords(way.languages, ''));
  const lead = sorted[0].count * 2 > topics.length ? 'Most' : 'Some';
  return `${lead} courses show their examples in ${ways[0]}. Others use ${ways.slice(1).join(', or ')}.`;
}

/**
 * The sections of all courses, topics first, then languages, then projects, each in the API's order; a section with no
 * course is left out.
 */
export function courseSectionsOf(courses: readonly LearnCourseCard[]): CourseSection[] {
  const topics = courses.filter((course) => course.kind === 'TOPIC');
  const languages = courses.filter((course) => course.kind === 'LANGUAGE');
  const sections: CourseSection[] = [];
  if (topics.length) {
    sections.push({
      kind: 'TOPIC',
      title: 'Topics, in any language',
      sub: topicLanguagesLineOf(topics),
      courses: topics,
    });
  }
  if (languages.length) {
    const average = languages.reduce((sum, course) => sum + course.lessons, 0) / languages.length;
    const about = Math.max(10, Math.round(average / 10) * 10);
    sections.push({
      kind: 'LANGUAGE',
      title: 'Languages',
      sub: `About ${countWords(about)} lessons each.`,
      courses: languages,
    });
  }
  const projects = courses.filter(isProjectCourse);
  if (projects.length) sections.push({ kind: 'PROJECT', ...PROJECT_SECTION, courses: projects });
  return sections;
}

/** A course the search found, its name marked when the name matched. */
export type FoundCourse = { course: LearnCourseCard; name: MarkedText };

/**
 * What the search of all courses found: courses by name, kind or project (a project course's `owner/name` or its
 * organisation's login), then lessons by name, live ones only.
 */
export type CoursesSearch = {
  query: string;
  sections: (CourseSection & { found: FoundCourse[] })[];
  lessons: LearnLessonListItem[];
};

/** The search of all courses. Nothing typed: every course, and no lessons. */
export function coursesSearchOf(
  courses: readonly LearnCourseCard[],
  lessons: readonly LearnLessonListItem[],
  raw: string,
): CoursesSearch {
  const query = searchQueryOf(raw);
  const sections = courseSectionsOf(courses).flatMap((section) => {
    const found = section.courses.flatMap((course): FoundCourse[] => {
      if (!query) return [{ course, name: { text: course.name } }];
      const name = markedTextOf(course.name, query);
      if ('mark' in name) return [{ course, name }];
      const project = course.project;
      const byProject = [project?.repo, project?.org].some((text) => !!text && wordStartMatchOf(text, query));
      return byProject || wordStartMatchOf(KIND_WORDS[course.kind], query) ? [{ course, name }] : [];
    });
    return found.length ? [{ ...section, found }] : [];
  });
  const shown = new Set(courses.map((course) => course.slug));
  const found = query
    ? lessons.filter(
        (lesson) => !lesson.paused && shown.has(lesson.course.slug) && wordStartMatchOf(lesson.title, query) !== null,
      )
    : [];
  return { query, sections, lessons: found };
}

/** How many lessons the search shows before "Show N more lessons". */
export const LESSONS_SHOWN_FIRST = 6;

/** "2 courses · 5 lessons": what was found, each part only when there is one. Null when nothing was. */
export function foundWordsOf(search: CoursesSearch): CountPart[] | null {
  const courses = search.sections.reduce((sum, section) => sum + section.found.length, 0);
  const parts: CountPart[] = [];
  if (courses > 0) parts.push({ count: courses, words: courses === 1 ? ' course' : ' courses' });
  if (search.lessons.length > 0) {
    parts.push({ count: search.lessons.length, words: search.lessons.length === 1 ? ' lesson' : ' lessons' });
  }
  return parts.length ? parts : null;
}

/**
 * A learner's figure on a course card: "10 of 86 learned", or "All 86 learned", none with nothing learned (never "0 of
 * 86 learned"); and how many are marked as known.
 */
export function courseCardStandingOf(
  mine: Pick<LearnCourseMineCard, 'learned' | 'known'>,
  lessons: number,
): { learned: CountPart | null; all: boolean; known: number | null } | null {
  if (mine.learned <= 0 && mine.known <= 0) return null;
  const all = lessons > 0 && mine.learned >= lessons;
  return {
    learned: all
      ? { count: lessons, words: ' learned' }
      : mine.learned > 0
        ? { count: mine.learned, words: ` of ${countWords(lessons)} learned` }
        : null,
    all,
    known: mine.known > 0 ? mine.known : null,
  };
}

/** The bar on a course card's bottom edge: mastered, practised, learned only, then marked as known; no empty part. */
export type CourseBarPart = { kind: 'mastered' | 'practised' | 'learned' | 'known'; share: number };

/** The bar's parts, each as a share of the course's lessons, in percent. */
export function courseBarOf(
  mine: Pick<LearnCourseMineCard, 'learned' | 'practised' | 'mastered' | 'known'>,
  lessons: number,
): CourseBarPart[] {
  if (lessons <= 0) return [];
  const counts: [CourseBarPart['kind'], number][] = [
    ['mastered', mine.mastered],
    ['practised', mine.practised - mine.mastered],
    ['learned', mine.learned - mine.practised],
    ['known', mine.known],
  ];
  return counts
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, share: Math.min(100, (count / lessons) * 100) }));
}

/**
 * The bar's label, in the numbers the course's page writes (practised counts the Mastered ones too), each only when
 * above zero: "10 of 86 lessons learned: 4 practised, 1 mastered", "12 of 104 lessons learned: 4 practised, 40 marked
 * as known", "40 of 104 lessons marked as known".
 */
export function courseBarLabelOf(
  mine: Pick<LearnCourseMineCard, 'learned' | 'practised' | 'mastered' | 'known'>,
  lessons: number,
): string {
  const of = ` of ${countWords(lessons)} lessons`;
  if (mine.learned <= 0)
    return mine.known > 0 ? `${countWords(mine.known)}${of} marked as known` : lessonsWords(lessons);
  const more = [
    mine.practised > 0 ? `${countWords(mine.practised)} practised` : null,
    mine.mastered > 0 ? `${countWords(mine.mastered)} mastered` : null,
    mine.known > 0 ? `${countWords(mine.known)} marked as known` : null,
  ].filter((part) => part !== null);
  return `${countWords(mine.learned)}${of} learned${more.length ? `: ${more.join(', ')}` : ''}`;
}
