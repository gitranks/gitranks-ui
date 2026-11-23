import type { HighlightedCode } from './code-tokens';
import type { LearnQuestion } from './learn-question';
import type { LessonAnswerInput } from './lesson-answer-input';
import { isLanguageKey, pickedOf } from './lesson-answer-input';
import type { LearnLessonLink } from './lesson-page';

/*
 * The daily review (page 16): the lessons that are due, one question each, no lesson text and the lesson's name hidden
 * until the answer. The first pick counts; a wrong pick or "I don't remember" brings the lesson back the next day. Pure:
 * the page, the specs and the catalogue read the same words.
 */

/** One lesson of today's set: an opaque id, its course, and its question without the key. */
export type LearnReviewItem = { id: string; course: LearnLessonLink; question: LearnQuestion };

/** Today's set: ten lessons at most, how many more wait, and with nothing due when the next review is. */
export type LearnReview = {
  items: LearnReviewItem[];
  more: number;
  nextReviewAt: string | null;
  nextReviewLessons: number;
};

/** What an answer changed: Practised now, Mastered now, or back tomorrow at the same depth. */
export type LearnReviewChange = 'PRACTISED' | 'MASTERED' | 'BACK_TOMORROW';

/** The API's verdict on a review's answer: the question with its key, the lesson it was, and what changed. */
export type LearnReviewAnswered = {
  right: boolean;
  question: LearnQuestion;
  lesson: LearnLessonLink;
  change: LearnReviewChange;
};

/** Where to go once the review is done: the next lesson to learn, or the next course to start. */
export type ReviewNext = { kind: 'lesson' | 'course'; link: LearnLessonLink };

/** An item as the page draws it: with its code highlighted on the server. */
export type ReviewItemShown = LearnReviewItem & { highlighted: HighlightedCode[] };

/** The signed-in person's review as their route answers it. */
export type ReviewSide = {
  items: ReviewItemShown[];
  more: number;
  nextReviewAt: string | null;
  nextReviewLessons: number;
  next: ReviewNext | null;
};

/** One lesson answered in this sitting, for the end's list. */
export type ReviewDone = { lesson: LearnLessonLink; course: LearnLessonLink; change: LearnReviewChange };

/** The line under the card once answered: a bold lead, the words after it, and the depth now (none when it stays). */
export function reviewChangeLineOf(
  change: LearnReviewChange,
  forgot: boolean,
): { lead: string; text: string; depth: 2 | 3 | null } {
  if (change === 'PRACTISED') {
    return { lead: 'Practised now.', text: 'It was Learned. It comes back in 10 days.', depth: 2 };
  }
  if (change === 'MASTERED') {
    return {
      lead: 'Mastered now.',
      text: 'It was Practised. This is the top level: we will not ask it again.',
      depth: 3,
    };
  }
  return forgot
    ? { lead: 'It comes back tomorrow.', text: 'Nothing is lost: what you learned stays.', depth: null }
    : {
        lead: 'It comes back tomorrow.',
        text: 'A wrong pick only brings it back sooner. Nothing you learned is lost.',
        depth: null,
      };
}

/** The pills of a lesson on the end's list. */
export function reviewPillsOf(
  change: LearnReviewChange,
): { text: string; tone: 'practised' | 'mastered' | 'muted' | 'back' }[] {
  if (change === 'PRACTISED') {
    return [
      { text: 'Practised now', tone: 'practised' },
      { text: 'comes back in 10 days', tone: 'muted' },
    ];
  }
  if (change === 'MASTERED') return [{ text: 'Mastered now', tone: 'mastered' }];
  return [{ text: 'comes back tomorrow', tone: 'back' }];
}

const lessons = (count: number) => `${count} ${count === 1 ? 'lesson' : 'lessons'}`;

/** The end's title: every lesson of the set, or the set when more wait. */
export function reviewEndTitleOf(count: number, more: number): string {
  if (more > 0) return `You repeated ${lessons(count)}`;
  return count === 1 ? 'You repeated your one lesson' : `You repeated all ${count} lessons`;
}

/** What changed, in a sentence or two: "3 moved from Learned to Practised, 1 from Practised to Mastered. 2 come back tomorrow." */
export function reviewEndSummaryOf(done: readonly Pick<ReviewDone, 'change'>[]): string {
  const count = (change: LearnReviewChange) => done.filter((item) => item.change === change).length;
  const practised = count('PRACTISED');
  const mastered = count('MASTERED');
  const back = count('BACK_TOMORROW');
  const moved: string[] = [];
  if (practised) moved.push(`${practised} moved from Learned to Practised`);
  if (mastered) moved.push(`${mastered} ${practised ? 'from' : 'moved from'} Practised to Mastered`);
  const sentences = moved.length ? [`${moved.join(', ')}.`] : [];
  if (back) sentences.push(`${back} ${back === 1 ? 'comes' : 'come'} back tomorrow.`);
  return sentences.join(' ');
}

/** What the end says when more were due than one sitting takes. */
export const reviewMoreWordsOf = (more: number) =>
  `That is today’s set. ${more} more ${more === 1 ? 'is' : 'are'} due, and ${more === 1 ? 'it waits' : 'they wait'} for you.`;

/** The start of a date's day where the page is read. */
const dayOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const DAY_MS = 86_400_000;

/**
 * With nothing due: when the next review is, in the reader's own days, and how many lessons it has. With none coming
 * (nothing learned yet), what brings one.
 */
export function nextReviewWordsOf(at: string | null, count: number, now: Date): string {
  const when = at ? new Date(at) : null;
  if (!when || Number.isNaN(when.getTime()) || count < 1) {
    return 'A lesson you learn comes back here three days later, so it stays.';
  }
  const days = Math.round((dayOf(when) - dayOf(now)) / DAY_MS);
  const said = days <= 0 ? 'later today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return `Your next review is ${said}, with ${lessons(count)}.`;
}

/** A review's answer as the page sends it: a pick, or "I don't remember". */
export type ReviewAnswerInput = {
  item: string;
  picked: LessonAnswerInput['picked'] | null;
  forgot: boolean;
  language: string | null;
};

/** An item's id: printable, with no spaces, as the API makes them. */
const ITEM = /^[\x21-\x7e]{1,200}$/;

/** The answer as the API takes it, or null when any part is not of its shape: a pick, or "I don't remember" alone. */
export function reviewAnswerInputOf(input: {
  item?: unknown;
  picked?: unknown;
  forgot?: unknown;
  language?: unknown;
}): ReviewAnswerInput | null {
  const { item, forgot, language } = input ?? {};
  if (typeof item !== 'string' || !ITEM.test(item)) return null;
  if (forgot !== true && forgot !== false && forgot !== undefined) return null;
  if (language !== null && language !== undefined && !isLanguageKey(language)) return null;
  const lang = (language as string | null | undefined) ?? null;
  if (forgot === true) {
    if (input.picked !== null && input.picked !== undefined) return null;
    return { item, picked: null, forgot: true, language: lang };
  }
  const picked = pickedOf(input.picked);
  return picked === null ? null : { item, picked, forgot: false, language: lang };
}
