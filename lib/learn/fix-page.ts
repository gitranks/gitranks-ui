import type { Route } from 'next';

import { type IssuesRow, issuesRowOf, type LearnIssueLesson } from './issues';
import { coursePath, learnFixAnswersPath, learnFixPath, learnFixWalkthroughPath, learnLessonPath } from './paths';
import { lessonFixesPathOf } from './real-issues';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { dayMonthOf } from '@/lib/workspace/pr-timeline-made';

/*
 * The public page of a fix, "Learn from it" (page 12): what the public read adds beside the timeline, the person's
 * marks that fill fixed places on it, and every word of its two cards. Pure: the page, the person's route and the
 * board read the same functions.
 */

export type LearnFixState = 'OPEN' | 'MERGED' | 'CLOSED';
export type LearnFixMade = 'LEARN' | 'CONTRIBUTE';

/** What "Learn from it" needs beside the timeline, the same for everyone. */
export type LearnFixPage = {
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  /** The pull request's number. */
  number: number;
  state: LearnFixState;
  made: LearnFixMade;
  fixer: string;
  /** The walkthrough's questions; null without one (none written, or held while reports are looked at). */
  questions: number | null;
  /** How many people passed the walkthrough; null for none. */
  passes: number | null;
  lesson: LearnIssueLesson | null;
  answersShared: boolean;
  title: string | null;
  /** The agent as a page names it ("Claude Code"); null when it never said. */
  agent: string | null;
  mergedAt: string | null;
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const textOf = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const countOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

function lessonOf(value: unknown): LearnIssueLesson | null {
  const lesson = recordOf(value);
  const slug = textOf(lesson?.slug);
  const title = textOf(lesson?.title);
  if (!lesson || !slug || !title) return null;
  return { slug, title, course: textOf(lesson.course) ?? '', courseName: textOf(lesson.courseName) ?? '' };
}

const STATES: readonly LearnFixState[] = ['OPEN', 'MERGED', 'CLOSED'];

/** The public read as the page takes it; null for none, or one not of its shape. */
export function learnFixOf(value: unknown): LearnFixPage | null {
  const read = recordOf(value);
  if (!read) return null;
  const repo = textOf(read.repo);
  const number = countOf(read.number);
  const fixer = textOf(read.fixer);
  const state = STATES.find((each) => each === read.state);
  if (!repo || !number || !fixer || !state || (read.made !== 'LEARN' && read.made !== 'CONTRIBUTE')) return null;
  return {
    repo,
    issueNumber: countOf(read.issueNumber) ?? 0,
    number,
    state,
    made: read.made,
    fixer,
    questions: countOf(read.questions),
    passes: countOf(read.passes),
    lesson: lessonOf(read.lesson),
    answersShared: read.answersShared === true,
    title: textOf(read.title),
    agent: textOf(read.agent),
    mergedAt: textOf(read.mergedAt),
  };
}

/** A pull request as the sitemap matches it: `owner/name#number`, lower case. */
export const fixKeyOf = ({ nameWithOwner, number }: PrRef) => `${nameWithOwner.toLowerCase()}#${number}`;

/** Whether a pull request has a "Learn from it" view: made with Learn and not closed without a merge. */
export const hasLearnView = (fix: Pick<LearnFixPage, 'made' | 'state'> | null): boolean =>
  !!fix && fix.made === 'LEARN' && fix.state !== 'CLOSED';

/**
 * Whether "Learn from it" is the canonical of both views: a merged Learn fix, the ones the sitemap lists there. An
 * open one keeps "How it was made" as its own canonical, where the sitemap lists it, until it merges.
 */
export const isLearnCanonical = (fix: Pick<LearnFixPage, 'made' | 'state'> | null): boolean =>
  !!fix && fix.made === 'LEARN' && fix.state === 'MERGED';

/* ------------------------------------------------------------------------------------------------------------------ */
/* The person's marks                                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------ */

export type FixLessonMark = 'LEARNED' | 'MASTERED' | 'MARKED_AS_KNOWN';
export type FixSimilarBecause = 'SAME_LESSON' | 'SAME_PROJECT' | 'SAME_LANGUAGE';

/** An issue of the person's own list like the fix, masked, and why it is there. */
export type FixSimilar = { row: IssuesRow; because: FixSimilarBecause };

/** The signed-in person's marks on a fix: their walkthrough, their lesson, and up to three similar issues. */
export type FixMarks = {
  fixer: boolean;
  /** The fixer's own walkthrough is held while reports are looked at: true for the fixer alone. */
  held: boolean;
  /** Questions answered so far; null for none. */
  answered: number | null;
  passedAt: string | null;
  lesson: FixLessonMark | null;
  lessonAt: string | null;
  similar: FixSimilar[];
};

const MARKS: readonly FixLessonMark[] = ['LEARNED', 'MASTERED', 'MARKED_AS_KNOWN'];
const BECAUSE: readonly FixSimilarBecause[] = ['SAME_LESSON', 'SAME_PROJECT', 'SAME_LANGUAGE'];

/** The most similar issues a fix's page shows. */
export const FIX_SIMILAR_SHOWN = 3;

/** The person's read as the page takes it; null for none (signed out, Learn not open to them) or one not of its shape. */
export function fixMarksOf(value: unknown): FixMarks | null {
  const read = recordOf(value);
  if (!read || typeof read.fixer !== 'boolean') return null;
  const similar = (Array.isArray(read.similar) ? read.similar : [])
    .map((each): FixSimilar | null => {
      const item = recordOf(each);
      const row = issuesRowOf(item?.issue);
      const because = BECAUSE.find((one) => one === item?.because);
      return row && because ? { row, because } : null;
    })
    .filter((each): each is FixSimilar => each !== null)
    .slice(0, FIX_SIMILAR_SHOWN);
  return {
    fixer: read.fixer,
    held: read.fixer && read.walkthroughHeld === true,
    answered: countOf(read.answered),
    passedAt: textOf(read.passedAt),
    lesson: MARKS.find((mark) => mark === read.lesson) ?? null,
    lessonAt: textOf(read.lessonAt),
    similar,
  };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The words                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A card's mark, in its fixed place right of the title. */
export type FixCardMark = { text: string; tone: 'positive' | 'muted' };

/** One of the two cards: its words, its one link, its button and its mark. */
export type FixCardWords = {
  kind: 'walkthrough' | 'lesson';
  eyebrow: string;
  title: string;
  /** The lesson card's course, linked inside its text. */
  course: { name: string; href: Route } | null;
  text: string;
  link: { text: string; href: Route } | null;
  button: { text: string; href: Route };
  mark: FixCardMark | null;
  /** The person has done what the card offers: its button turns quiet and the main action moves on. */
  done: boolean;
};

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** The walkthrough's card; null when the page shows no walkthrough. */
export function walkthroughCardOf(pr: PrRef, fix: LearnFixPage, marks: FixMarks | null): FixCardWords | null {
  if (!fix.questions) return null;
  const own = marks?.fixer === true;
  const passed = own || !!marks?.passedAt;
  const link = own
    ? { text: 'See your answers', href: learnFixAnswersPath(pr, fix.fixer) }
    : fix.answersShared
      ? { text: `See ${fix.fixer}’s answers`, href: learnFixAnswersPath(pr, fix.fixer) }
      : null;
  const mark: FixCardMark | null = marks?.passedAt
    ? { text: `Passed ${dayMonthOf(marks.passedAt)}`, tone: 'positive' }
    : marks?.answered
      ? { text: `${Math.min(marks.answered, fix.questions)} of ${fix.questions} answered`, tone: 'muted' }
      : null;
  return {
    kind: 'walkthrough',
    eyebrow: 'The walkthrough',
    title: `${plural(fix.questions, 'question')} about this change`,
    course: null,
    text: `What went wrong and how the fix works. ${own ? 'You' : fix.fixer} answered them before the pull request opened.`,
    link,
    button: {
      text: passed ? 'Open it again' : marks?.answered ? 'Continue the walkthrough' : 'Start the walkthrough',
      href: learnFixWalkthroughPath(pr),
    },
    mark,
    done: passed,
  };
}

/** The lesson's card; null for a fix with no lesson. */
export function lessonCardOf(fix: LearnFixPage, marks: FixMarks | null): FixCardWords | null {
  const { lesson } = fix;
  if (!lesson) return null;
  const mark: FixCardMark | null =
    marks?.lesson === 'LEARNED'
      ? { text: marks.lessonAt ? `Learned ${dayMonthOf(marks.lessonAt)}` : 'Learned', tone: 'positive' }
      : marks?.lesson === 'MASTERED'
        ? { text: 'Mastered', tone: 'positive' }
        : marks?.lesson === 'MARKED_AS_KNOWN'
          ? { text: 'Marked as known', tone: 'muted' }
          : null;
  const learned = marks?.lesson === 'LEARNED' || marks?.lesson === 'MASTERED';
  return {
    kind: 'lesson',
    eyebrow: 'The lesson',
    title: lesson.title,
    course: lesson.course && lesson.courseName ? { name: lesson.courseName, href: coursePath(lesson.course) } : null,
    text: 'The idea this fix uses, taught on its own.',
    link: { text: 'All fixes that used it', href: lessonFixesPathOf(lesson.slug) },
    button: { text: learned ? 'Open the lesson' : 'Learn the lesson', href: learnLessonPath(lesson.slug) },
    mark,
    done: learned,
  };
}

/** Where the page's one main action is: the first card not done, then the first similar issue, else none. */
export function mainActionOf(
  cards: readonly (FixCardWords | null)[],
  marks: FixMarks | null,
): 'walkthrough' | 'lesson' | 'similar' | null {
  const open = cards.find((card) => card && !card.done);
  if (open) return open.kind;
  return marks?.similar.length ? 'similar' : null;
}

/** Why a similar issue is there: "Uses the same lesson.", "In the same project.", "Also in Go.". */
export function similarBecauseOf({ row, because }: FixSimilar): string {
  if (because === 'SAME_LESSON') return 'Uses the same lesson.';
  if (because === 'SAME_PROJECT') return 'In the same project.';
  return row.issue.language ? `Also in ${row.issue.language}.` : 'In the same language.';
}

/**
 * The Learn part of "How it was made", above its list: what the fixer answered before sending it, where to read the
 * questions and answers, and the lesson behind the fix. Null without a walkthrough or a lesson to show.
 */
export type FixLearnBlockWords = {
  title: string | null;
  text: string | null;
  answers: { text: string; href: Route } | null;
  /** "Answer them yourself": left out on a pull request closed without a merge. */
  yourself: { text: string; href: Route } | null;
  lesson: { title: string; href: Route } | null;
};

export function fixLearnBlockOf(pr: PrRef, fix: LearnFixPage | null): FixLearnBlockWords | null {
  if (fix?.made !== 'LEARN' || (!fix.questions && !fix.lesson)) return null;
  const questions = fix.questions;
  return {
    title: questions
      ? `${fix.fixer} answered ${plural(questions, 'question')} about this change before sending it`
      : null,
    text: questions
      ? 'In GitRanks Learn the agent that writes a fix also has to teach it. The questions are about this change only, and the pull request cannot be sent until the person answers them.'
      : null,
    answers: questions
      ? fix.answersShared
        ? { text: `See the questions and ${fix.fixer}’s answers`, href: learnFixAnswersPath(pr, fix.fixer) }
        : { text: 'See the questions', href: learnFixWalkthroughPath(pr) }
      : null,
    yourself:
      questions && fix.state !== 'CLOSED' ? { text: 'Answer them yourself', href: learnFixWalkthroughPath(pr) } : null,
    lesson: fix.lesson ? { title: fix.lesson.title, href: learnLessonPath(fix.lesson.slug) } : null,
  };
}

/**
 * A Learn fix's part of the pull request's Markdown copy, which covers both views: its walkthrough, its lesson, and
 * the "Learn from it" page while it has one. Plain lines, absolute links; none for a pull request made without Learn.
 */
export function fixMarkdownOf(pr: PrRef, fix: LearnFixPage | null, absolute: (path: string) => string): string[] {
  if (fix?.made !== 'LEARN') return [];
  const lines = ['## Learn from it', ''];
  if (hasLearnView(fix))
    lines.push(`- [Learn from it](${absolute(learnFixPath(pr))}): the walkthrough and the lesson.`);
  if (fix.questions) {
    const passes = fix.passes ? `, passed by ${plural(fix.passes, 'person', 'people')}` : '';
    lines.push(
      `- [The walkthrough](${absolute(learnFixWalkthroughPath(pr))}): ${plural(fix.questions, 'question')} about the change${passes}. ${fix.fixer} answered them before the pull request opened.`,
    );
    if (fix.answersShared) lines.push(`- [${fix.fixer}’s answers](${absolute(learnFixAnswersPath(pr, fix.fixer))})`);
  }
  if (fix.lesson) {
    const course = fix.lesson.courseName ? ` (part of ${fix.lesson.courseName})` : '';
    lines.push(`- [The lesson: ${fix.lesson.title}](${absolute(learnLessonPath(fix.lesson.slug))})${course}`);
  }
  return lines.length > 2 ? lines : [];
}
