import type { LearnCourse, LearnCourseMine } from './course';
import { isLanguageKey, pickedOf } from './lesson-answer-input';
import type { LearnLessonLink } from './lesson-page';
import { isContentSlug } from './paths';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import type { LearnPicked, LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * The check of a course and "What you know": one question for each group, no right or wrong until the end,
 * then our guess of what the person knows, which they tick and untick before anything is saved. Pure: the page, the
 * specs and the catalogue read the same words and counts.
 */

/** How a group's check question went. */
export type LearnCheckOutcome = 'RIGHT' | 'WRONG' | 'DONT_KNOW' | 'NOT_ANSWERED';

/** One question of the check: the group it stands for, the question without its key, and whether it is answered. */
export type LearnCheckQuestion = { group: LearnLessonLink; question: LearnQuestion; answered: boolean };

/** A lesson on the result: whether the answers propose it as known, and whether it is learned already. */
export type LearnCheckLesson = { slug: string; title: string; proposed: boolean; learned: boolean };

/** A group on the result: how its question went, and its lessons in order. */
export type LearnCheckGroup = { group: LearnLessonLink; outcome: LearnCheckOutcome; lessons: LearnCheckLesson[] };

/** A run of the check: its questions, and once it ended, the result. */
export type LearnCheck = {
  id: string;
  course: LearnLessonLink;
  questions: LearnCheckQuestion[];
  result: LearnCheckGroup[] | null;
};

/** What saving the marks answered: where the person starts (none when nothing is left) and how many are marked. */
export type LearnKnownSaved = { start: LearnLessonLink | null; known: number };

/** A question as the page draws it: with its code highlighted on the server. */
export type CheckQuestionShown = LearnCheckQuestion & { highlighted: HighlightedCode[] };

/** The person's run as their route answers it. */
export type CheckSide = Omit<LearnCheck, 'questions'> & { questions: CheckQuestionShown[] };

// The sheet of what the person knows: the check's result and "What you know" draw the same one.

/** A lesson on the sheet: `proposed` is what the sheet opened with ticked. */
export type KnownLesson = { slug: string; title: string; learned: boolean; proposed: boolean };

/** A group on the sheet; `outcome` only on the check's result. */
export type KnownGroup = { slug: string; title: string; outcome: LearnCheckOutcome | null; lessons: KnownLesson[] };

/** The check's result as a sheet. */
export const knownGroupsOfResult = (result: readonly LearnCheckGroup[]): KnownGroup[] =>
  result.map(({ group, outcome, lessons }) => ({
    slug: group.slug,
    title: group.title,
    outcome,
    lessons: lessons.map(({ slug, title, proposed, learned }) => ({ slug, title, proposed, learned })),
  }));

/**
 * The course as a sheet of what the person knows now: their marks ticked, their learned lessons shown as learned. A
 * paused lesson is left out: it cannot be started, so it is neither marked nor where anyone starts.
 */
export function knownGroupsOfCourse(
  course: Pick<LearnCourse, 'groups'>,
  mine: Pick<LearnCourseMine, 'lessons'>,
): KnownGroup[] {
  const marks = new Map(mine.lessons.map((lesson) => [lesson.slug, lesson]));
  return course.groups
    .map((group) => ({
      slug: group.slug,
      title: group.name,
      outcome: null,
      lessons: group.lessons
        .filter((lesson) => !lesson.paused)
        .map((lesson) => {
          const mark = marks.get(lesson.slug);
          const learned = !!mark && mark.depth !== 'NONE';
          return { slug: lesson.slug, title: lesson.title, learned, proposed: !learned && !!mark?.known };
        }),
    }))
    .filter((group) => group.lessons.length > 0);
}

/**
 * The marks a sheet does not show: the course's lessons marked as known now (not learned) that are not on the sheet,
 * such as paused ones. A save marks the lessons it sends and unmarks every other lesson of the course, so these are
 * sent as they are: a save never removes a mark the person could not see, and one that changes nothing changes nothing.
 */
export function keptKnownOf(
  course: Pick<LearnCourse, 'groups'>,
  mine: Pick<LearnCourseMine, 'lessons'>,
  shown: readonly KnownGroup[],
): string[] {
  const marks = new Map(mine.lessons.map((lesson) => [lesson.slug, lesson]));
  const onSheet = new Set(shown.flatMap((group) => group.lessons.map((lesson) => lesson.slug)));
  return course.groups.flatMap((group) =>
    group.lessons
      .filter((lesson) => {
        const mark = marks.get(lesson.slug);
        return !onSheet.has(lesson.slug) && !!mark?.known && mark.depth === 'NONE';
      })
      .map((lesson) => lesson.slug),
  );
}

/** What the sheet opens with ticked: the proposed lessons, never a learned one. */
export const tickedFirstOf = (groups: readonly KnownGroup[]): ReadonlySet<string> =>
  new Set(
    groups.flatMap((group) => group.lessons.filter((lesson) => lesson.proposed && !lesson.learned)).map((l) => l.slug),
  );

const markable = (group: KnownGroup) => group.lessons.filter((lesson) => !lesson.learned);

/** A group's box: every lesson it can mark ticked, some, none, or none to mark (all learned). */
export type GroupBox = 'on' | 'mixed' | 'off' | 'learned';

export function groupBoxOf(group: KnownGroup, ticked: ReadonlySet<string>): GroupBox {
  const open = markable(group);
  if (!open.length) return 'learned';
  const on = open.filter((lesson) => ticked.has(lesson.slug)).length;
  return on === open.length ? 'on' : on ? 'mixed' : 'off';
}

const lessonsWord = (count: number) => (count === 1 ? 'lesson' : 'lessons');

/** The line under a group's name: how many of its lessons are marked, and how many are learned. Never a zero. */
export function groupWordsOf(group: KnownGroup, ticked: ReadonlySet<string>): string {
  const total = group.lessons.length;
  const learned = total - markable(group).length;
  const known = markable(group).filter((lesson) => ticked.has(lesson.slug)).length;
  if (learned === total) return total === 1 ? 'its one lesson learned' : `all ${total} lessons learned`;
  const tail = learned ? ` · ${learned} learned` : '';
  if (known && known === total)
    return total === 1 ? 'its one lesson marked as known' : `all ${total} lessons marked as known`;
  if (known) return `${known} of ${total} marked as known${tail}`;
  return `${total} ${lessonsWord(total)}${tail}`;
}

/** A group ticked or unticked whole: every lesson it can mark, on when not all are, off when all are. */
export function toggledGroupOf(group: KnownGroup, ticked: ReadonlySet<string>): Set<string> {
  const next = new Set(ticked);
  const on = groupBoxOf(group, ticked) !== 'on';
  for (const lesson of markable(group)) {
    if (on) next.add(lesson.slug);
    else next.delete(lesson.slug);
  }
  return next;
}

/** One lesson ticked or unticked; a learned one never changes. */
export function toggledLessonOf(lesson: KnownLesson, ticked: ReadonlySet<string>): Set<string> {
  const next = new Set(ticked);
  if (lesson.learned) return next;
  if (next.has(lesson.slug)) next.delete(lesson.slug);
  else next.add(lesson.slug);
  return next;
}

/** The sheet's numbers: lessons marked, lessons in all, lessons learned. */
export function knownCountsOf(groups: readonly KnownGroup[], ticked: ReadonlySet<string>) {
  const lessons = groups.flatMap((group) => group.lessons);
  return {
    known: lessons.filter((lesson) => !lesson.learned && ticked.has(lesson.slug)).length,
    total: lessons.length,
    learned: lessons.filter((lesson) => lesson.learned).length,
  };
}

/** The slugs to save: the ticked lessons in course order, never a learned one. */
export const knownSlugsOf = (groups: readonly KnownGroup[], ticked: ReadonlySet<string>): string[] =>
  groups.flatMap((group) =>
    markable(group)
      .filter((lesson) => ticked.has(lesson.slug))
      .map((lesson) => lesson.slug),
  );

/** Where the person starts: the first lesson, in course order, neither learned nor ticked. None when all are. */
export function startOf(groups: readonly KnownGroup[], ticked: ReadonlySet<string>): LearnLessonLink | null {
  for (const group of groups) {
    for (const lesson of group.lessons) {
      if (!lesson.learned && !ticked.has(lesson.slug)) return { slug: lesson.slug, title: lesson.title };
    }
  }
  return null;
}

/**
 * The words of the result's strip, after its squares: how many questions were answered of all. A run stopped before
 * any answer says so without a count of nothing.
 */
export function checkResultWordsOf(outcomes: readonly LearnCheckOutcome[]): {
  lead: string;
  number: number | null;
  tail: string;
} {
  const total = outcomes.length;
  const answered = outcomes.filter((outcome) => outcome !== 'NOT_ANSWERED').length;
  if (answered) return { lead: '', number: answered, tail: ` of ${total} answered` };
  if (total === 1) return { lead: 'Stopped before its one question', number: null, tail: '' };
  return { lead: 'Stopped before the first of ', number: total, tail: ' questions' };
}

/** What a button of the sheet's card does: saves and goes on, or saves nothing and starts. */
export type SheetDoes = 'save' | 'save-and-pick' | 'start-first' | 'save-and-start' | 'mark-nothing';

/**
 * The card's buttons, for the page and the catalogue alike. "What you know" saves. The result: all known, save and
 * pick another course; nothing known or learned, start at the first lesson; otherwise save and start there, and with
 * lessons marked, the way to mark nothing and start at the first lesson not learned, named when it is not lesson 1.
 */
export function sheetActionsOf(
  mode: 'check' | 'known',
  groups: readonly KnownGroup[],
  ticked: ReadonlySet<string>,
): { primary: { label: string; does: SheetDoes }; secondary: { label: string; does: SheetDoes } | null } {
  if (mode === 'known') return { primary: { label: 'Save', does: 'save' }, secondary: null };
  const counts = knownCountsOf(groups, ticked);
  if (!startOf(groups, ticked)) {
    return { primary: { label: 'Save and pick another course', does: 'save-and-pick' }, secondary: null };
  }
  if (!counts.known && !counts.learned) {
    return { primary: { label: 'Start at the first lesson', does: 'start-first' }, secondary: null };
  }
  const primary = { label: 'Save and start there', does: 'save-and-start' as const };
  if (!counts.known) return { primary, secondary: null };
  const first = startOf(groups, new Set());
  const lessonOne = groups[0]?.lessons[0]?.slug;
  const where = !first || first.slug === lessonOne ? 'lesson 1' : first.title;
  return { primary, secondary: { label: `Mark nothing and start at ${where}`, does: 'mark-nothing' } };
}

/** The result's title, from the answers alone: how many groups the person knows of all. */
export function checkTitleOf(groups: readonly Pick<KnownGroup, 'outcome'>[]): string {
  const right = groups.filter((group) => group.outcome === 'RIGHT').length;
  if (!right) return 'We found nothing you already know';
  if (right === groups.length) {
    return groups.length === 1 ? 'You already know its one group' : `You already know all ${groups.length} groups`;
  }
  return `You already know ${right} of the ${groups.length} groups`;
}

/** The words under the result's title. */
export const checkIntroOf = (groups: readonly Pick<KnownGroup, 'outcome'>[]) =>
  groups.some((group) => group.outcome === 'RIGHT')
    ? 'This is our guess from your answers: one question stood for each group. Tick or untick a group, or open it and do the same for single lessons. Nothing is saved until you press the button.'
    : 'That is fine: the course starts at its first lesson. If you do know some of it, tick the groups or the lessons yourself.';

/** The pill of a group on the result: how its question went. */
export function outcomePillOf(outcome: LearnCheckOutcome | null): { text: string; right: boolean } | null {
  if (outcome === 'RIGHT') return { text: 'You answered right', right: true };
  if (outcome === 'WRONG') return { text: 'You answered wrong', right: false };
  if (outcome === 'DONT_KNOW') return { text: 'You said “I don’t know”', right: false };
  if (outcome === 'NOT_ANSWERED') return { text: 'Not answered', right: false };
  return null;
}

/** The card's title: how many lessons are marked of all. */
export function knownTitleOf({ known, total }: { known: number; total: number }): string {
  if (!known) return 'Nothing is marked as known';
  if (known === total) return total === 1 ? 'Its one lesson marked as known' : `All ${total} lessons marked as known`;
  return `${known} of ${total} lessons marked as known`;
}

/** The card's line on where the person starts: the lesson's name apart, so the page sets it in bold. */
export function startWordsOf(
  start: LearnLessonLink | null,
  { known, learned }: { known: number; learned: number },
): { before: string; name: string; after: string } | null {
  if (!start) return null;
  const after = known || learned ? ', the first lesson you do not know yet.' : ', the first lesson of the course.';
  return { before: 'You start at ', name: start.title, after };
}

/** What the person changed on our guess, when anything: "You ticked 46 lessons yourself." */
export function handWordsOf(groups: readonly KnownGroup[], ticked: ReadonlySet<string>): string | null {
  const lessons = groups.flatMap(markable);
  const added = lessons.filter((lesson) => !lesson.proposed && ticked.has(lesson.slug)).length;
  const removed = lessons.filter((lesson) => lesson.proposed && !ticked.has(lesson.slug)).length;
  if (added && removed) return `You ticked ${added} ${lessonsWord(added)} and unticked ${removed} yourself.`;
  if (added) return `You ticked ${added} ${lessonsWord(added)} yourself.`;
  if (removed) return `You unticked ${removed} ${lessonsWord(removed)} yourself.`;
  return null;
}

/** What the visitor's page says the check does, with the course's groups. */
export const checkVisitorTextOf = (course: { name: string; groups: readonly unknown[] }) =>
  `It asks one question for ${course.groups.length === 1 ? 'its one group' : `each of the ${course.groups.length} groups`} in ${course.name}, then marks what you already know, so you start further in. Without an account there is nowhere to keep the result.`;

// What the page sends.

/** A run's id and a group's slug: printable, with no spaces. */
const ID = /^[\x21-\x7e]{1,200}$/;

/** A check's answer as the page sends it: a pick, or "I don't know". */
export type CheckAnswerInput = {
  course: string;
  group: string;
  picked: LearnPicked | null;
  dontKnow: boolean;
  language: string | null;
};

/** The answer as the API takes it, or null when any part is not of its shape: a pick, or "I don't know" alone. */
export function checkAnswerInputOf(input: {
  course?: unknown;
  group?: unknown;
  picked?: unknown;
  dontKnow?: unknown;
  language?: unknown;
}): CheckAnswerInput | null {
  const { course, group, dontKnow, language } = input ?? {};
  if (typeof course !== 'string' || !isContentSlug(course)) return null;
  if (typeof group !== 'string' || !isContentSlug(group)) return null;
  if (dontKnow !== true && dontKnow !== false && dontKnow !== undefined) return null;
  if (language !== null && language !== undefined && !isLanguageKey(language)) return null;
  const lang = (language as string | null | undefined) ?? null;
  if (dontKnow === true) {
    if (input.picked !== null && input.picked !== undefined) return null;
    return { course, group, picked: null, dontKnow: true, language: lang };
  }
  const picked = pickedOf(input.picked);
  return picked === null ? null : { course, group, picked, dontKnow: false, language: lang };
}

/** The most lessons one save can mark: well above any course. */
export const KNOWN_MAX = 2000;

/** Marks as the API takes them, or null: a course, its lessons' slugs (each once), and the run whose result it saves. */
export function knownSaveInputOf(input: {
  course?: unknown;
  known?: unknown;
  check?: unknown;
}): { course: string; known: string[]; check: string | null } | null {
  const { course, known, check } = input ?? {};
  if (typeof course !== 'string' || !isContentSlug(course)) return null;
  if (!Array.isArray(known) || known.length > KNOWN_MAX) return null;
  if (!known.every((slug) => typeof slug === 'string' && isContentSlug(slug))) return null;
  if (new Set(known).size !== known.length) return null;
  if (check !== null && check !== undefined && (typeof check !== 'string' || !ID.test(check))) return null;
  return { course, known: known as string[], check: (check as string | null | undefined) ?? null };
}
