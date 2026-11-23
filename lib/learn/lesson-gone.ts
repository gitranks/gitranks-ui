import type { LearnAddress } from './address-gate';
import type { LearnLessonMine } from './lesson-page';

/*
 * The page of a lesson that is paused or removed: what the address was, a title, one sentence, and one way on. A line
 * in a box shows only to the person it is about: a learner who learned it.
 */

/** Which of the two the page says. */
export type LessonGoneState = 'PAUSED' | 'REMOVED';

/** What the page says, from what the address still knows: the lesson's title and its course, when known. */
export type LessonGoneText = { eyebrow: string; title: string; lead: string };

/** The state of an address the page is drawn for; null for any other (the page is then not there). */
export const lessonGoneStateOf = (address: Pick<LearnAddress, 'state'> | null): LessonGoneState | null =>
  address?.state === 'PAUSED' || address?.state === 'REMOVED' ? address.state : null;

/** The page's words. With no title or no course known, the sentence names what it knows and nothing else. */
export function lessonGoneTextOf(
  state: LessonGoneState,
  { title, course }: Pick<LearnAddress, 'title' | 'course'>,
): LessonGoneText {
  const named = title ? `“${title}”` : null;
  const eyebrow = 'GitRanks Learn · A lesson';
  if (state === 'PAUSED') {
    const what = named
      ? course
        ? `${named}, a lesson of ${course.title}`
        : named
      : course
        ? `this lesson of ${course.title}`
        : 'this lesson';
    return {
      eyebrow,
      title: 'This lesson is paused',
      lead: `We are correcting a mistake in ${what}. It will be back at this address.`,
    };
  }
  const lead = course
    ? `${named ?? 'This lesson'} is no longer part of ${course.title}.`
    : `${named ?? 'This lesson'} is no longer part of its course.`;
  return { eyebrow, title: 'This lesson was removed', lead };
}

/** "14 Nov": the day a lesson was learned, in the time zone given, else the browser's own. */
export const learnedOnOf = (learnedAt: string, timeZone?: string): string | null => {
  const at = new Date(learnedAt);
  if (Number.isNaN(at.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(at);
};

/**
 * The learner's line: only for a person who learned the lesson (not one who marked it known) and whose day it was is
 * known. Null for anyone else, who sees no box.
 */
export function lessonGoneLearnerLineOf(
  state: LessonGoneState,
  mine: Pick<LearnLessonMine, 'depth' | 'known' | 'learnedAt'> | null,
  timeZone?: string,
): string | null {
  if (!mine || mine.known || mine.depth === 'NONE' || !mine.learnedAt) return null;
  const on = learnedOnOf(mine.learnedAt, timeZone);
  if (!on) return null;
  return state === 'PAUSED'
    ? `You learned it on ${on}. That stays. We will not ask you to repeat it while it is paused.`
    : `You learned it on ${on}. It no longer counts in the course, and it has left your review.`;
}
