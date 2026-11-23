import { describe, expect, it } from 'vitest';

import { goneLearnerMine, pausedAddress, removedAddress } from './__fixtures__/lesson-gone';
import { learnedOnOf, lessonGoneLearnerLineOf, lessonGoneStateOf, lessonGoneTextOf } from './lesson-gone';

describe('lessonGoneStateOf', () => {
  it('draws the page for a paused or a removed lesson only', () => {
    expect(lessonGoneStateOf(pausedAddress)).toBe('PAUSED');
    expect(lessonGoneStateOf(removedAddress)).toBe('REMOVED');
    for (const state of ['LIVE', 'MOVED', 'MISSING'] as const) {
      expect(lessonGoneStateOf({ state }), state).toBeNull();
    }
    expect(lessonGoneStateOf(null)).toBeNull();
  });
});

describe('lessonGoneTextOf', () => {
  it('names the lesson and its course, as the boards say it', () => {
    expect(lessonGoneTextOf('PAUSED', pausedAddress)).toEqual({
      eyebrow: 'GitRanks Learn · A lesson',
      title: 'This lesson is paused',
      lead: 'We are correcting a mistake in “Find duplicates in one pass with a set”, a lesson of Algorithms and data structures. It will be back at this address.',
    });
    expect(lessonGoneTextOf('REMOVED', removedAddress)).toEqual({
      eyebrow: 'GitRanks Learn · A lesson',
      title: 'This lesson was removed',
      lead: '“Find duplicates in one pass with a set” is no longer part of Algorithms and data structures.',
    });
  });

  it('names only what it knows', () => {
    const course = pausedAddress.course;
    expect(lessonGoneTextOf('PAUSED', { title: null, course }).lead).toBe(
      'We are correcting a mistake in this lesson of Algorithms and data structures. It will be back at this address.',
    );
    expect(lessonGoneTextOf('PAUSED', { title: 'Sets', course: null }).lead).toBe(
      'We are correcting a mistake in “Sets”. It will be back at this address.',
    );
    expect(lessonGoneTextOf('PAUSED', { title: null, course: null }).lead).toBe(
      'We are correcting a mistake in this lesson. It will be back at this address.',
    );
    expect(lessonGoneTextOf('REMOVED', { title: null, course }).lead).toBe(
      'This lesson is no longer part of Algorithms and data structures.',
    );
    expect(lessonGoneTextOf('REMOVED', { title: null, course: null }).lead).toBe(
      'This lesson is no longer part of its course.',
    );
  });

  it('never writes the long dash', () => {
    for (const state of ['PAUSED', 'REMOVED'] as const) {
      expect(JSON.stringify(lessonGoneTextOf(state, pausedAddress))).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe('the learner line', () => {
  it('writes the day as "14 Nov", in the time zone given', () => {
    expect(learnedOnOf('2026-11-14T09:30:00.000Z', 'UTC')).toBe('14 Nov');
    expect(learnedOnOf('2026-11-14T23:30:00.000Z', 'Asia/Tokyo')).toBe('15 Nov');
    expect(learnedOnOf('not a date', 'UTC')).toBeNull();
  });

  it('tells a learner what stays and what goes', () => {
    expect(lessonGoneLearnerLineOf('PAUSED', goneLearnerMine, 'UTC')).toBe(
      'You learned it on 14 Nov. That stays. We will not ask you to repeat it while it is paused.',
    );
    expect(lessonGoneLearnerLineOf('REMOVED', goneLearnerMine, 'UTC')).toBe(
      'You learned it on 14 Nov. It no longer counts in the course, and it has left your review.',
    );
  });

  it('says nothing to anyone who did not learn it, or whose day is not known', () => {
    for (const mine of [
      null,
      { ...goneLearnerMine, depth: 'NONE' as const },
      { ...goneLearnerMine, known: true },
      { ...goneLearnerMine, learnedAt: null },
      { ...goneLearnerMine, learnedAt: 'soon' },
    ]) {
      expect(lessonGoneLearnerLineOf('PAUSED', mine, 'UTC'), JSON.stringify(mine)).toBeNull();
    }
  });
});
