import type { HomeContributeCard, HomeLearnCard, HomeProducts } from '../products-block-words';

/** The time every home block fixture is drawn at. */
export const HOME_NOW = new Date('2026-11-24T09:00:00Z');

export const contributeCards = {
  needsYou: { state: 'NEEDS_YOU', count: 2, repo: 'kelp-db/kelp', box: 'ROUND_WAITING', round: 2 },
  open: { state: 'OPEN', count: 3, repo: null, box: null, round: null },
  newIssues: { state: 'NEW_ISSUES', count: null, repo: null, box: null, round: null },
} satisfies Record<string, HomeContributeCard>;

const NEXT = { slug: 'count-things-with-a-hash-map', title: 'Count things with a hash map' };

export const learnCards = {
  reviewDue: { state: 'REVIEW_DUE', count: 6, lesson: NEXT, course: null, group: null, at: null },
  reviewDueNoNext: { state: 'REVIEW_DUE', count: 6, lesson: null, course: null, group: null, at: null },
  nextLesson: {
    state: 'NEXT_LESSON',
    count: null,
    lesson: NEXT,
    course: 'Algorithms and data structures',
    group: 'Hash maps and sets',
    at: null,
  },
  nextReview: {
    state: 'NEXT_REVIEW',
    count: 3,
    lesson: null,
    course: null,
    group: null,
    at: '2026-11-26T09:00:00Z',
  },
} satisfies Record<string, HomeLearnCard>;

/** The block for each viewer: null for a visitor, or anyone whose read failed. */
export const homeProducts = {
  visitor: null,
  neither: { usesContribute: false, usesLearn: false, contribute: null, learn: null },
  learner: { usesContribute: false, usesLearn: true, contribute: null, learn: learnCards.reviewDue },
  contributor: { usesContribute: true, usesLearn: false, contribute: contributeCards.needsYou, learn: null },
  both: { usesContribute: true, usesLearn: true, contribute: contributeCards.needsYou, learn: learnCards.reviewDue },
  open: { usesContribute: true, usesLearn: true, contribute: contributeCards.open, learn: learnCards.nextLesson },
  quiet: { usesContribute: true, usesLearn: true, contribute: contributeCards.newIssues, learn: learnCards.nextReview },
  learnerNothing: { usesContribute: false, usesLearn: true, contribute: null, learn: null },
} satisfies Record<string, HomeProducts | null>;
