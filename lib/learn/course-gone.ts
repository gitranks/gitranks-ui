import type { LearnAddress } from './address-gate';
import type { LessonGoneState, LessonGoneText } from './lesson-gone';

/*
 * The page of a course that is paused or removed, as a lesson's (page 33): what the address was, a title, one
 * sentence, and one way on, to all courses. The page is the same for everyone: what a learner had in the course is
 * not read.
 */

/** The page's words. With no title known, the sentence says "This course". */
export function courseGoneTextOf(state: LessonGoneState, { title }: Pick<LearnAddress, 'title'>): LessonGoneText {
  const eyebrow = 'GitRanks Learn · A course';
  const named = title ? `“${title}”` : null;
  if (state === 'PAUSED') {
    return {
      eyebrow,
      title: 'This course is paused',
      lead: `We are correcting a mistake in ${named ?? 'this course'}. It will be back at this address.`,
    };
  }
  return {
    eyebrow,
    title: 'This course was removed',
    lead: `${named ?? 'This course'} is no longer part of GitRanks Learn.`,
  };
}

/** The page of an address under Learn that leads nowhere: the same for a draft, a page we hid and a mistyped one. */
export const LEARN_MISSING_TEXT: LessonGoneText = {
  eyebrow: 'GitRanks Learn',
  title: 'This page does not exist',
  lead: 'The address may be wrong, or the page is not public.',
};
