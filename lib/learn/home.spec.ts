import { describe, expect, it } from 'vitest';

import { courseCards } from './__fixtures__/course';
import {
  HOME_NOW,
  homeAllDone,
  homeCoursesDone,
  homeDay,
  homeDoneToday,
  homeFirstDays,
  homeNewLearner,
  homeNoCourses,
  homeNothingDue,
} from './__fixtures__/learn-home-page';
import {
  courseCardOf,
  daysUntil,
  dayWordsOf,
  dueLineOf,
  dueTitleOf,
  firstReviewTitleOf,
  homeBoxesOf,
  isNewLearner,
  type LearnHomeRead,
  learnHomeReadOf,
  learnPageOf,
  lessonBoxOf,
  linkOf,
  nextCourseLineOf,
  nextReviewWordsOf,
  otherSectionsOf,
  reviewBoxOf,
  suggestedForOf,
  totalsLineOf,
} from './home';

const now = new Date(HOME_NOW);
const go = courseCards.find((course) => course.slug === 'go');

describe("Learn home's answer, read tolerantly", () => {
  it('reads a full answer as it came', () => {
    expect(learnHomeReadOf(homeDay)).toEqual(homeDay);
  });

  it('reads an answer without the newer fields as empty parts, never a failure', () => {
    expect(learnHomeReadOf({ due: 2 })).toEqual({ ...homeNoCourses, due: 2 });
    expect(learnHomeReadOf({})).toEqual(homeNoCourses);
  });

  it('has no answer for nothing, or for something that is not an object', () => {
    expect(learnHomeReadOf(null)).toBeNull();
    expect(learnHomeReadOf(undefined)).toBeNull();
    expect(learnHomeReadOf([homeDay])).toBeNull();
    expect(learnHomeReadOf('home')).toBeNull();
  });

  it('turns a bad count into none, and a fraction into a whole number', () => {
    const home = learnHomeReadOf({ due: -3, learned: 4.7, practised: 'x', mastered: Number.NaN });
    expect(home).toMatchObject({ due: 0, learned: 4, practised: 0, mastered: 0 });
  });

  it('knows only the two highlights', () => {
    expect(learnHomeReadOf({ highlight: 'REVIEW' })?.highlight).toBe('REVIEW');
    expect(learnHomeReadOf({ highlight: 'NEXT_LESSON' })?.highlight).toBe('NEXT_LESSON');
    expect(learnHomeReadOf({ highlight: 'REAL_ISSUE' })?.highlight).toBeNull();
  });

  it('drops a course of a kind this page does not draw, or without a slug or a name', () => {
    const project = { ...go, slug: 'acme-widgets', kind: 'PROJECT' };
    const home = learnHomeReadOf({
      otherCourses: [go, project, { ...go, slug: '' }, { ...go, name: null }, null],
      courses: [
        { course: project, learned: 3 },
        { course: go, learned: 2 },
      ],
    });
    expect(home?.otherCourses).toEqual([go]);
    expect(home?.courses.map((mine) => mine.course.slug)).toEqual(['go']);
  });

  it("reads a course's missing numbers and lists as unknown and empty", () => {
    expect(courseCardOf({ slug: 'go', name: 'Go', kind: 'LANGUAGE' })).toEqual({
      slug: 'go',
      name: 'Go',
      kind: 'LANGUAGE',
      covers: '',
      languages: [],
      lessons: 0,
      numbers: { learners: null, goodShare: null },
    });
  });

  it('keeps at most three suggested courses, and forgets a reason it does not know', () => {
    const suggested = learnHomeReadOf({
      suggested: [
        { course: go, reason: 'main-language' },
        { course: go, reason: 'a-new-reason' },
        { course: go, reason: 'most-start' },
        { course: go, reason: 'other-language' },
      ],
    })?.suggested;
    expect(suggested?.map((each) => each.reason)).toEqual(['main-language', null, 'most-start']);
  });

  it('reads a link only with both its slug and its title', () => {
    expect(linkOf({ slug: 'a', title: 'A' })).toEqual({ slug: 'a', title: 'A' });
    expect(linkOf({ slug: 'a' })).toBeNull();
    expect(linkOf({ slug: ' ', title: 'A' })).toBeNull();
    expect(linkOf(null)).toBeNull();
  });
});

describe('who gets Learn home at /learn', () => {
  const unset = { state: 'NONE' as const };
  it('gives the landing to someone not set up who has learned nothing', () => {
    expect(learnPageOf({ setup: unset, home: { learned: 0 }, entered: false })).toBe('landing');
  });

  it('gives Learn home to someone set up, or who has learned a lesson', () => {
    expect(learnPageOf({ setup: { state: 'SAVED' }, home: { learned: 0 }, entered: false })).toBe('home');
    expect(learnPageOf({ setup: unset, home: { learned: 1 }, entered: false })).toBe('home');
  });

  it('gives Learn home to someone who already uses Learn today, set up or not', () => {
    expect(learnPageOf({ setup: unset, home: { learned: 0 }, entered: true })).toBe('home');
  });

  it('never sends a learner to the landing on a failed read', () => {
    expect(learnPageOf({ setup: null, home: { learned: 0 }, entered: false })).toBe('home');
    expect(learnPageOf({ setup: unset, home: null, entered: false })).toBe('home');
  });

  it('gives the landing to someone the API answers neither a setup nor a home for', () => {
    for (const entered of [false, true]) {
      expect(learnPageOf({ setup: null, home: null, entered })).toBe('landing');
    }
  });
});

describe('the next lesson box', () => {
  it('names the next lesson and its course', () => {
    expect(lessonBoxOf(homeDay)).toEqual({
      kind: 'next',
      lesson: homeDay.next,
      course: 'Algorithms and data structures',
    });
  });

  it('names no course when the next lesson is in none started', () => {
    expect(lessonBoxOf({ ...homeDay, courses: [] })).toMatchObject({ kind: 'next', course: null });
  });

  it('offers the next course once every course started is finished, with the last one finished', () => {
    const box = lessonBoxOf(homeCoursesDone);
    expect(box).toMatchObject({ kind: 'next-course', finished: 'Go' });
    if (box.kind !== 'next-course') throw new Error(box.kind);
    expect(nextCourseLineOf(box)).toMatch(
      /^You finished Go\. Databases and SQL is a good next step(: \d+ lessons)?\.$/,
    );
    expect(nextCourseLineOf({ ...box, finished: null, lessons: null })).toBe('Databases and SQL is a good next step.');
    expect(nextCourseLineOf({ ...box, finished: null, lessons: 1 })).toBe(
      'Databases and SQL is a good next step: 1 lesson.',
    );
  });

  it('asks to pick a course with none started', () => {
    expect(lessonBoxOf(homeNewLearner)).toEqual({ kind: 'pick' });
  });

  it('says all is done once every course is finished and no other is left', () => {
    expect(lessonBoxOf(homeAllDone)).toEqual({ kind: 'all-done' });
    expect(lessonBoxOf({ ...homeAllDone, otherCourses: courseCards.slice(0, 1) })).toEqual({ kind: 'pick' });
  });
});

describe('the review box', () => {
  it('counts the lessons due and the courses they come from', () => {
    const box = reviewBoxOf(homeDay, now, null);
    expect(box).toEqual({ kind: 'due', due: 6, courses: 2 });
    if (box.kind !== 'due') throw new Error(box.kind);
    expect(dueTitleOf(6)).toBe('6 lessons to repeat');
    expect(dueTitleOf(1)).toBe('1 lesson to repeat');
    expect(dueLineOf(box)).toBe(
      'About 5 minutes, from 2 courses. Getting one right again moves it from Learned to Practised.',
    );
    expect(dueLineOf({ kind: 'due', due: 1, courses: 1 })).toBe(
      'About a minute. Getting one right again moves it from Learned to Practised.',
    );
  });

  it('says the review is done for today, and when the next lessons come', () => {
    expect(reviewBoxOf(homeDoneToday, now, null)).toEqual({
      kind: 'done-today',
      repeated: 6,
      next: 'Next: 3 lessons on Monday.',
    });
  });

  it('says when the first review comes in the first days', () => {
    expect(reviewBoxOf(homeFirstDays, now, null)).toEqual({ kind: 'first', days: 3 });
    expect(firstReviewTitleOf(3)).toBe('Your first review is in 3 days');
    expect(firstReviewTitleOf(1)).toBe('Your first review is tomorrow');
    expect(firstReviewTitleOf(0)).toBe('Your first review is today');
    expect(firstReviewTitleOf(null)).toBe('Your first review comes soon');
  });

  it('has nothing to repeat before a lesson is learned', () => {
    expect(reviewBoxOf(homeNewLearner, now, null)).toEqual({ kind: 'none-learned' });
  });

  it('has nothing today, and says when the next lessons come', () => {
    expect(reviewBoxOf(homeNothingDue, now, null)).toEqual({ kind: 'nothing', next: 'Next: 3 lessons on Monday.' });
    expect(reviewBoxOf(homeAllDone, now, null)).toEqual({ kind: 'nothing', next: 'Next: 12 lessons on 9 Nov.' });
    expect(reviewBoxOf({ ...homeNothingDue, nextReviewAt: null }, now, null)).toEqual({ kind: 'nothing', next: null });
  });
});

describe('which box is lit', () => {
  it('lights the review when lessons are due', () => {
    expect(homeBoxesOf(homeDay, now, null).highlight).toBe('review');
  });

  it('lights the next lesson with nothing due', () => {
    expect(homeBoxesOf(homeNothingDue, now, null).highlight).toBe('lesson');
    expect(homeBoxesOf({ ...homeNothingDue, highlight: null }, now, null).highlight).toBe('lesson');
  });

  it("follows the API's highlight only when its box has something to press", () => {
    const both: LearnHomeRead = { ...homeDay, highlight: 'NEXT_LESSON' };
    expect(homeBoxesOf(both, now, null).highlight).toBe('lesson');
    expect(homeBoxesOf({ ...homeNothingDue, highlight: 'REVIEW' }, now, null).highlight).toBe('lesson');
  });

  it('lights nothing when both boxes are quiet', () => {
    expect(homeBoxesOf(homeAllDone, now, null).highlight).toBeNull();
    expect(homeBoxesOf(homeNewLearner, now, null).highlight).toBeNull();
  });
});

describe('days ahead, in the zone days are counted in', () => {
  it('counts whole days from today', () => {
    expect(daysUntil('2026-10-28T23:00:00.000Z', now, null)).toBe(0);
    expect(daysUntil('2026-10-29T12:00:00.000Z', now, null)).toBe(1);
    expect(daysUntil('2026-10-20T12:00:00.000Z', now, null)).toBe(0);
    expect(daysUntil(null, now, null)).toBeNull();
    expect(daysUntil('not a day', now, null)).toBeNull();
  });

  it('reads the day in the zone asked for', () => {
    // 02:00 UTC on the 29th is still the 28th in New York, already the 29th in Berlin.
    expect(daysUntil('2026-10-29T02:00:00.000Z', now, 'America/New_York')).toBe(0);
    expect(daysUntil('2026-10-29T02:00:00.000Z', now, 'Europe/Berlin')).toBe(1);
  });

  it('says today, tomorrow, the weekday within a week, else the date', () => {
    expect(dayWordsOf('2026-10-28T20:00:00.000Z', now, null)).toBe('today');
    expect(dayWordsOf('2026-10-29T20:00:00.000Z', now, null)).toBe('tomorrow');
    expect(dayWordsOf('2026-11-02T20:00:00.000Z', now, null)).toBe('on Monday');
    expect(dayWordsOf('2026-12-02T20:00:00.000Z', now, null)).toBe('on 2 Dec');
    expect(dayWordsOf('2027-01-05T20:00:00.000Z', now, null)).toBe('on 5 Jan 2027');
  });

  it('says one lesson in the singular, and nothing with none planned', () => {
    const at = '2026-10-29T20:00:00.000Z';
    expect(nextReviewWordsOf({ nextReviewAt: at, nextReviewLessons: 1 }, now, null)).toBe('Next: 1 lesson tomorrow.');
    expect(nextReviewWordsOf({ nextReviewAt: at, nextReviewLessons: 0 }, now, null)).toBeNull();
    expect(nextReviewWordsOf({ nextReviewAt: null, nextReviewLessons: 4 }, now, null)).toBeNull();
  });
});

describe('the courses below the boxes', () => {
  it('shows the totals with no part that is none', () => {
    expect(totalsLineOf(homeDay)).toBe('13 lessons learned · 4 practised · 1 mastered');
    expect(totalsLineOf(homeFirstDays)).toBe('4 lessons learned');
    expect(totalsLineOf({ learned: 1, practised: 0, mastered: 1 })).toBe('1 lesson learned · 1 mastered');
    expect(totalsLineOf(homeNewLearner)).toBeNull();
  });

  it('groups the other courses by kind, leaving out a kind with none', () => {
    const sections = otherSectionsOf(homeDay);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((section) => section.courses.length > 0)).toBe(true);
    expect(sections.flatMap((section) => section.courses.map((course) => course.slug))).not.toContain('go');
    expect(otherSectionsOf(homeNoCourses)).toEqual([]);
  });

  it('knows a new learner: no course started and nothing learned', () => {
    expect(isNewLearner(homeNewLearner)).toBe(true);
    expect(isNewLearner(homeDay)).toBe(false);
    expect(isNewLearner({ courses: [], learned: 2 })).toBe(false);
  });

  it('says whom the suggested courses are for, from the setup', () => {
    expect(suggestedForOf({ mainLanguage: 'go', otherLanguages: ['python'], level: 3 })).toBe(
      'Suggested for Go and Python, experienced developer',
    );
    expect(suggestedForOf({ mainLanguage: 'go', otherLanguages: ['go', 'rust', 'php', 'ruby'], level: null })).toBe(
      'Suggested for Go, Rust and PHP',
    );
    expect(suggestedForOf({ mainLanguage: 'javascript', otherLanguages: ['typescript', 'java'], level: null })).toBe(
      'Suggested for JavaScript, TypeScript and Java',
    );
    expect(suggestedForOf({ mainLanguage: 'go', otherLanguages: [], level: 1 })).toBe(
      'Suggested for Go, new to programming',
    );
    expect(suggestedForOf({ mainLanguage: null, otherLanguages: ['Go'], level: 2 })).toBeNull();
    expect(suggestedForOf(null)).toBeNull();
  });
});
