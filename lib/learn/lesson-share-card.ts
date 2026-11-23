import type { LearnLesson } from './lesson-page';
import { learnFactCardPath, learnLessonCardPath, learnLessonPath } from './paths';
import { clipText } from '@/lib/seo/clip-text';

/*
 * A lesson's two share pictures: where each lives, and what each says. Pure and free of server reads, so the cards,
 * the metadata and the design catalogue use the same rules.
 */

/** A picture's version: the time the lesson last changed, so a changed lesson is a new address a site draws again. */
export const lessonCardVersionOf = (lesson: Pick<LearnLesson, 'changedAt'>): string => {
  const at = Date.parse(lesson.changedAt);
  return Number.isNaN(at) ? '0' : at.toString(36);
};

/** The lesson's picture, under its one current address. */
export const learnLessonCardUrlOf = (lesson: Pick<LearnLesson, 'slug' | 'changedAt'>) =>
  `${learnLessonCardPath(lesson.slug)}?v=${lessonCardVersionOf(lesson)}`;
/** Its fun fact's picture, under its one current address. */
export const learnFactCardUrlOf = (lesson: Pick<LearnLesson, 'slug' | 'changedAt'>) =>
  `${learnFactCardPath(lesson.slug)}?v=${lessonCardVersionOf(lesson)}`;

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
