import { describe, expect, it } from 'vitest';

import { courseGoneTextOf, LEARN_MISSING_TEXT } from './course-gone';

describe("a gone course's page", () => {
  it('names the course when its title is known, and says "this course" otherwise', () => {
    expect(courseGoneTextOf('PAUSED', { title: 'Algorithms and data structures' })).toEqual({
      eyebrow: 'GitRanks Learn · A course',
      title: 'This course is paused',
      lead: 'We are correcting a mistake in “Algorithms and data structures”. It will be back at this address.',
    });
    expect(courseGoneTextOf('REMOVED', { title: 'Algorithms and data structures' }).lead).toBe(
      '“Algorithms and data structures” is no longer part of GitRanks Learn.',
    );
    expect(courseGoneTextOf('PAUSED', { title: null }).lead).toBe(
      'We are correcting a mistake in this course. It will be back at this address.',
    );
    expect(courseGoneTextOf('REMOVED', { title: null }).lead).toBe('This course is no longer part of GitRanks Learn.');
  });

  it('says the same for every address that leads nowhere', () => {
    expect(LEARN_MISSING_TEXT).toEqual({
      eyebrow: 'GitRanks Learn',
      title: 'This page does not exist',
      lead: 'The address may be wrong, or the page is not public.',
    });
  });
});
