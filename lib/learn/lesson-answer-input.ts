import { isContentSlug } from './paths';

/*
 * What a lesson's page sends from the browser, checked before the API is asked: nothing but short strings, small
 * numbers and a pick of a known shape. The API grades the pick again and alone decides what is right.
 */

/** A lesson's answer as the page sends it. */
export type LessonAnswerInput = {
  slug: string;
  question: string;
  picked: number | number[] | string[] | 'myth' | 'fact';
  tries: number;
  language: string | null;
};

/** A rating as the page sends it, with its comment when one was written. */
export type LessonFeedbackInput = { lesson: string; good: boolean; comment: string | null };

const ID_MAX = 200;
const PICKS_MAX = 20;
const TRIES_MAX = 1000;
/** The longest comment the page's box takes. */
export const COMMENT_MAX = 2000;
const LANGUAGE = /^[a-z][a-z0-9+#-]{0,19}$/;

const isIndex = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000;
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= ID_MAX;

/** A pick of one of the six kinds: an index or a line, indexes, ids in order, or myth or fact. Null otherwise. */
export function pickedOf(value: unknown): LessonAnswerInput['picked'] | null {
  if (value === 'myth' || value === 'fact') return value;
  if (isIndex(value)) return value;
  if (!Array.isArray(value) || value.length === 0 || value.length > PICKS_MAX) return null;
  if (value.every(isIndex)) return [...value];
  if (value.every(isId)) return [...value];
  return null;
}

/** The answer as the API takes it, or null when any part is not of its shape. */
export function lessonAnswerInputOf(input: {
  slug?: unknown;
  question?: unknown;
  picked?: unknown;
  tries?: unknown;
  language?: unknown;
}): LessonAnswerInput | null {
  const { slug, question, tries, language } = input;
  const picked = pickedOf(input.picked);
  if (typeof slug !== 'string' || !isContentSlug(slug) || !isId(question) || picked === null) return null;
  if (typeof tries !== 'number' || !Number.isInteger(tries) || tries < 1 || tries > TRIES_MAX) return null;
  if (language !== null && (typeof language !== 'string' || !LANGUAGE.test(language))) return null;
  return { slug, question, picked, tries, language };
}

/** The rating as the API takes it: an empty comment is none, and a long one is refused. Null when not of its shape. */
export function lessonFeedbackInputOf(input: {
  lesson?: unknown;
  good?: unknown;
  comment?: unknown;
}): LessonFeedbackInput | null {
  const { lesson, good, comment } = input;
  if (typeof lesson !== 'string' || !isContentSlug(lesson) || typeof good !== 'boolean') return null;
  if (comment !== null && comment !== undefined && typeof comment !== 'string') return null;
  const text = comment?.trim() ?? '';
  if (text.length > COMMENT_MAX) return null;
  return { lesson, good, comment: text || null };
}
