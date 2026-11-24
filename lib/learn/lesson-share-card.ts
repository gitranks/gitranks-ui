import { countWords } from './course';
import type { LearnLesson } from './lesson-page';
import { learnFactCardPath, learnLessonCardPath, learnLessonPath } from './paths';
import { clipText } from '@/lib/seo/clip-text';

/*
 * A lesson's two share pictures: where each lives, and what each says. Pure and free of server reads, so the cards,
 * the metadata and the design catalogue use the same rules.
 */

/** Which of a lesson's two pictures: its own, or its fun fact's. */
export type LessonCardKind = 'lesson' | 'fact';

/** What a picture's version reads: everything either picture draws, and when the lesson last changed. */
type CardLesson = Pick<LearnLesson, 'slug' | 'changedAt' | 'title' | 'course' | 'group' | 'fact' | 'fixesMerged'>;

/** A lesson's merged fixes are drawn from this many: fewer leave the place empty. */
const FIXES_SHOWN_FROM = 3;

/** The lesson picture's figure: "14 merged fixes in real projects used it", from 3; null below, so no zero shows. */
export function lessonCardFixesOf(lesson: Pick<LearnLesson, 'fixesMerged'>): { value: string; label: string } | null {
  const fixes = lesson.fixesMerged;
  if (typeof fixes !== 'number' || !Number.isInteger(fixes) || fixes < FIXES_SHOWN_FROM) return null;
  return { value: countWords(fixes), label: 'merged fixes in real projects used it' };
}

/** A short, stable hash of a text (32-bit FNV-1a), in base 36. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * A picture's version: a hash of what it draws and of the time the lesson last changed. A change to anything it shows,
 * a course or a group renamed included, is a new address a site fetches again.
 */
export function lessonCardVersionOf(kind: LessonCardKind, lesson: CardLesson): string {
  const drawn =
    kind === 'fact'
      ? [lesson.title, lesson.fact?.title ?? '', lesson.fact?.text ?? '']
      : [lesson.title, lesson.course.title, lesson.group.title, lessonCardFixesOf(lesson)?.value ?? ''];
  return hashOf([kind, lesson.changedAt, ...drawn].join('\n'));
}

/** The lesson's picture, under its one current address. */
export const learnLessonCardUrlOf = (lesson: CardLesson) =>
  `${learnLessonCardPath(lesson.slug)}?v=${lessonCardVersionOf('lesson', lesson)}`;
/** Its fun fact's picture, under its one current address. */
export const learnFactCardUrlOf = (lesson: CardLesson) =>
  `${learnFactCardPath(lesson.slug)}?v=${lessonCardVersionOf('fact', lesson)}`;

/** The address printed on a picture: the lesson's page, without the scheme. */
export const lessonCardAddressOf = (slug: string) => `gitranks.com${learnLessonPath(slug)}`;

/** The most a picture's fact says. */
const FACT_MAX = 220;

/**
 * A fact as its picture says it: whole sentences from its start, as many as fit in 220 characters; a first sentence
 * longer than that, cut at a word.
 */
export function factCardTextOf(text: string): string {
  const sentences =
    text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?]+(?:[.!?]+["”’)]*|$)\s*/g) ?? [];
  let kept = '';
  for (const sentence of sentences) {
    if ((kept + sentence).trim().length > FACT_MAX) break;
    kept += sentence;
  }
  return kept.trim() || clipText(text.replace(/\s+/g, ' ').trim(), FACT_MAX);
}

/** The title's size on a lesson's picture: smaller in two steps for a long title, so it keeps to three lines. */
export const lessonCardTitleSize = (title: string) => (title.length > 64 ? 46 : title.length > 40 ? 54 : 62);

/** The address's size: smaller for a long slug, so it keeps to one line. */
export const lessonCardAddressSize = (slug: string) => (slug.length > 44 ? 20 : 24);

/** A picture's preview title, as a posted link shows it: "<title> · GitRanks Learn". */
export const learnShareTitleOf = (title: string) => `${title} · GitRanks Learn`;
