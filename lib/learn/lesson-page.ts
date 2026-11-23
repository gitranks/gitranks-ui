import { answerStartOf, type LearnAnswerState } from './learn-answer';
import { type LearnCode, type LearnPicked, type LearnQuestion, verdictOf } from './learn-question';

/**
 * A lesson's page: the lesson as the API gives it, the person's side of it, its place in its group, and the rules the
 * page draws from them (the squares, the depth line, the insights, the main button's words, where the examples sit).
 * Pure, so the page, the specs and the catalogue read the same rules.
 */

/** How deep a lesson is learned: not yet, learned in the lesson, practised in a review, mastered. */
export type LearnDepth = 'NONE' | 'LEARNED' | 'PRACTISED' | 'MASTERED';

export type LearnLessonLevel = 'EASY' | 'MEDIUM' | 'HARD';

/** A link to a lesson, a course or a group: its slug and its title. */
export type LearnLessonLink = { slug: string; title: string };

/** "Did you know?": its own short title, the text, where it comes from and a link to it. */
export type LearnFact = { title: string; text: string; source: string; url: string };

/** One example of a lesson, by its name (`main` is the lesson's own), in each language of its course. */
export type LearnExample = { name: string; codes: LearnCode[] };

/** A lesson as the API gives it to everyone. */
export type LearnLesson = {
  slug: string;
  title: string;
  level: LearnLessonLevel;
  /** The lesson in Markdown. A line of its own `[[example: name]]` or `[[visual: name]]` places one there. */
  body: string;
  course: LearnLessonLink;
  group: LearnLessonLink;
  examples: LearnExample[];
  /** The visuals the body can place, by name. */
  visuals: unknown;
  /** The lesson's own question, with its key: the page grades it. */
  question: LearnQuestion;
  /** The answer to give in an interview. */
  say: string;
  fact: LearnFact | null;
  /** A prompt for the person's own agent. */
  deeper: string | null;
  buildsOn: LearnLessonLink[];
  previous: LearnLessonLink | null;
  next: LearnLessonLink | null;
  changedAt: string;
  publishedAt: string;
};

/** The person's side of a lesson: how deep, when it is next asked, their answer and their rating. */
export type LearnLessonMine = {
  depth: LearnDepth;
  /** Marked as known without answering: never counted or shown as learned. */
  known: boolean;
  learnedAt: string | null;
  dueAt: string | null;
  /** The right answer they gave, as it was sent. */
  picked: unknown;
  tries: number | null;
  /** "Good", "Not good", or not rated. */
  feedbackGood: boolean | null;
};

/** A lesson of a course's group, as the course lists it. */
export type LearnGroupLesson = { slug: string; title: string; level: LearnLessonLevel; paused: boolean };

/** A course's group: its lessons in order. */
export type LearnCourseGroup = { slug: string; name: string; lessons: LearnGroupLesson[] };

/** A square of the strip: one for each lesson of the group, by its depth; the current one ringed until it is learned. */
export type LessonSquare = 'none' | 'current' | 'learned' | 'practised' | 'mastered' | 'paused';

/** Where the lesson stands in its group: its place (from 0), how many lessons, and, for a member, the squares. */
export type LessonPlace = {
  index: number;
  count: number;
  /** One for each lesson of the group; null for a visitor. */
  squares: LessonSquare[] | null;
  /** How many of the group's lessons are learned, at any depth; null for a visitor. */
  learned: number | null;
};

const DEPTH_ORDER: Record<LearnDepth, number> = { NONE: 0, LEARNED: 1, PRACTISED: 2, MASTERED: 3 };

/** The deeper of two depths: depth never goes down. */
export const deeperOf = (a: LearnDepth, b: LearnDepth): LearnDepth => (DEPTH_ORDER[a] >= DEPTH_ORDER[b] ? a : b);

/** How many of three dots a depth fills: 1 learned, 2 practised, 3 mastered. */
export const depthDotsOf = (depth: LearnDepth) => DEPTH_ORDER[depth];

const SQUARE_OF: Record<LearnDepth, LessonSquare> = {
  NONE: 'none',
  LEARNED: 'learned',
  PRACTISED: 'practised',
  MASTERED: 'mastered',
};

/**
 * The lesson's place in its group. For a member, each lesson's square by its depth (`depths`, by slug): a paused one
 * dashed, the current one ringed while it is not learned. `current` is this lesson's own depth, which wins over the
 * group's (it is the fresher). A lesson not in the group is placed first, so the page still draws.
 */
export function lessonPlaceOf(
  lessons: readonly LearnGroupLesson[],
  slug: string,
  member: { depths: Readonly<Record<string, LearnDepth>>; current: LearnDepth } | null,
): LessonPlace {
  const count = Math.max(lessons.length, 1);
  const index = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.slug === slug),
  );
  if (!member) return { index, count, squares: null, learned: null };
  const depthOf = (lesson: LearnGroupLesson) =>
    lesson.slug === slug
      ? deeperOf(member.current, member.depths[slug] ?? 'NONE')
      : (member.depths[lesson.slug] ?? 'NONE');
  const listed = lessons.length ? lessons : [{ slug, title: '', level: 'EASY' as const, paused: false }];
  const squares = listed.map((lesson): LessonSquare => {
    const depth = depthOf(lesson);
    if (lesson.slug === slug) return depth === 'NONE' ? 'current' : SQUARE_OF[depth];
    if (lesson.paused) return 'paused';
    return SQUARE_OF[depth];
  });
  const learned = listed.filter((lesson) => depthOf(lesson) !== 'NONE').length;
  return { index, count, squares, learned };
}

/** Whether every lesson of the group that is not paused is learned: the group is finished. */
export const isGroupFinished = (place: LessonPlace) =>
  !!place.squares?.length && place.squares.every((square) => square !== 'none' && square !== 'current');

/** The last lesson of its group: its Next goes to another group. */
export const isLastOfGroup = (place: Pick<LessonPlace, 'index' | 'count'>) => place.index >= place.count - 1;

/** The first lesson of its group: its Previous goes to another group. */
export const isFirstOfGroup = (place: Pick<LessonPlace, 'index'>) => place.index <= 0;

/** The main button once the answer is right: a visitor signs in; a member goes on, or finishes the group. */
export function mainLabelOf({
  member,
  last,
  next,
}: {
  member: boolean;
  last: boolean;
  next: LearnLessonLink | null;
}): string {
  if (!member) return 'Sign in with GitHub to continue';
  if (last || !next) return 'Finish this group';
  return `Next: ${next.title}`;
}

const DAY = 24 * 60 * 60 * 1000;

/** A date's day as it is in a time zone, counted in whole days since 1970: for calendar differences. */
function dayNumberOf(date: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
  return Math.round(Date.UTC(part('year'), part('month') - 1, part('day')) / DAY);
}

/** When the lesson is asked again, in calendar days of the person's time zone: "Review tomorrow.", "Review in 3 days." */
export function reviewWordsOf(dueAt: string | null, now: Date, timeZone?: string): string | null {
  const due = dueAt ? new Date(dueAt) : null;
  if (!due || Number.isNaN(due.getTime())) return null;
  const days = dayNumberOf(due, timeZone) - dayNumberOf(now, timeZone);
  if (days <= 0) return 'Review today.';
  if (days === 1) return 'Review tomorrow.';
  return `Review in ${days} days.`;
}

/** The line under the card once a lesson is learned: the depth in bold, then what comes next. */
export type DepthLine = { dots: number; lead: string; tail: string | null };

/**
 * The depth line: "Learned. Review in 3 days.", "Learned. Group finished." right after the answer that finished the
 * group, "Practised. Review in 10 days.", "Mastered. Nothing more to do. This is the top level." Null before a lesson
 * is learned.
 */
export function depthLineOf({
  depth,
  dueAt,
  now,
  timeZone,
  groupFinished = false,
}: {
  depth: LearnDepth;
  dueAt: string | null;
  now: Date;
  timeZone?: string;
  groupFinished?: boolean;
}): DepthLine | null {
  switch (depth) {
    case 'NONE':
      return null;
    case 'MASTERED':
      return { dots: 3, lead: 'Mastered.', tail: 'Nothing more to do. This is the top level.' };
    case 'PRACTISED':
      return { dots: 2, lead: 'Practised.', tail: reviewWordsOf(dueAt, now, timeZone) };
    case 'LEARNED':
      return {
        dots: 1,
        lead: 'Learned.',
        tail: groupFinished ? 'Group finished.' : reviewWordsOf(dueAt, now, timeZone),
      };
  }
}

/** A row of "What to take with you": which insight, its title, and the line under the title while it is closed. */
export type InsightId = 'say' | 'fact' | 'deeper';
export type InsightRow = { id: InsightId; title: string; sub: string };

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** How many sentences a text has: a sentence ends at `.`, `!` or `?` before a space or the end. */
export function sentenceCountOf(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /\w/.test(sentence)).length;
}

/** The rows the lesson has: the interview answer always, the fact and the prompt only when the lesson holds them. */
export function insightRowsOf(lesson: Pick<LearnLesson, 'say' | 'fact' | 'deeper'>): InsightRow[] {
  const rows: InsightRow[] = [];
  if (lesson.say.trim()) {
    const count = sentenceCountOf(lesson.say);
    rows.push({
      id: 'say',
      title: 'Say it in an interview',
      sub: `The answer in ${NUMBER_WORDS[count] ?? count} sentence${count === 1 ? '' : 's'}`,
    });
  }
  if (lesson.fact?.text.trim()) rows.push({ id: 'fact', title: 'Did you know?', sub: lesson.fact.title });
  if (lesson.deeper?.trim()) rows.push({ id: 'deeper', title: 'Go deeper', sub: 'A prompt for your own agent' });
  return rows;
}

/** A part of the body: Markdown, or an example or a visual placed by its name. */
export type BodyPart = { kind: 'text'; markdown: string } | { kind: 'example' | 'visual'; name: string };

const PLACE_LINE = /^\[\[\s*(example|visual)\s*:\s*([\w-]+)\s*\]\]$/;

/**
 * The body cut where it places an example or a visual. A name the lesson does not have places nothing, and a name
 * placed twice shows once. With no example placed, the main example (else the first) follows the text.
 */
export function bodyPartsOf(
  body: string,
  { examples, visuals }: { examples: readonly string[]; visuals: readonly string[] },
): BodyPart[] {
  const parts: BodyPart[] = [];
  const placed = new Set<string>();
  let text: string[] = [];
  const flush = () => {
    const markdown = text.join('\n').trim();
    if (markdown) parts.push({ kind: 'text', markdown });
    text = [];
  };
  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
    const match = PLACE_LINE.exec(line.trim());
    if (!match) {
      text.push(line);
      continue;
    }
    flush();
    const kind = match[1] as 'example' | 'visual';
    const name = match[2];
    const known = kind === 'example' ? examples.includes(name) : visuals.includes(name);
    if (known && !placed.has(`${kind}:${name}`)) {
      placed.add(`${kind}:${name}`);
      parts.push({ kind, name });
    }
  }
  flush();
  if (![...placed].some((key) => key.startsWith('example:'))) {
    const main = examples.includes('main') ? 'main' : examples[0];
    if (main) parts.push({ kind: 'example', name: main });
  }
  return parts;
}

/** The visuals the lesson holds, by name: only those of an object's shape. */
export function visualsOf(visuals: unknown): Record<string, unknown> {
  return visuals && typeof visuals === 'object' && !Array.isArray(visuals) ? (visuals as Record<string, unknown>) : {};
}

/**
 * A lesson opened again after it was learned: the answer done, with the right pick the person gave. Null when there
 * is no stored pick, or it is not right for the question as it is now (the question changed): then it is asked again.
 */
export function storedAnswerOf(
  question: LearnQuestion,
  mine: Pick<LearnLessonMine, 'depth' | 'picked' | 'tries'> | null,
  language: string | null,
): LearnAnswerState | null {
  if (!mine || mine.depth === 'NONE' || mine.picked === null || mine.picked === undefined) return null;
  const picked = mine.picked as LearnPicked;
  const verdict = verdictOf(question, picked, language);
  if (!verdict?.right) return null;
  return {
    ...answerStartOf(question),
    phase: 'done',
    picked,
    tries: mine.tries ?? 1,
    shown: { right: true, why: verdict.why },
  };
}

/** Whether an answer is done and right. */
export const isRightAnswer = (state: LearnAnswerState) => state.phase === 'done' && !!state.shown?.right;

const CHECKED = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "12 Nov 2026", for the footer's "last checked"; null for a date that does not read. */
export function checkedDateOf(at: string): string | null {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : CHECKED.format(date);
}
