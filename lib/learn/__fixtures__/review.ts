import type { LearnLessonLink } from '../lesson-page';
import type { LearnReviewAnswered, ReviewDone, ReviewItemShown, ReviewNext, ReviewSide } from '../review';
import { hasDuplicateCodes, reviewQuestion, reviewQuestionKeyed } from './player';

/*
 * The review's fixtures: a set of six lessons from two courses, the call's replies for each outcome, the end's list
 * as page 16 draws it, and where the person goes next.
 */

export const algorithms: LearnLessonLink = { slug: 'algorithms', title: 'Algorithms and data structures' };
const sql: LearnLessonLink = { slug: 'sql', title: 'SQL' };

const hashSets: LearnLessonLink = { slug: 'hash-sets', title: 'Hash sets: is it there?' };
const twoPointers: LearnLessonLink = { slug: 'two-pointers', title: 'Two pointers' };
const bigO: LearnLessonLink = { slug: 'big-o-of-two-loops', title: 'Big-O of two loops' };
const joins: LearnLessonLink = { slug: 'inner-joins', title: 'Inner joins' };
const stacks: LearnLessonLink = { slug: 'stacks', title: 'Stacks' };
const indexes: LearnLessonLink = { slug: 'indexes', title: 'Indexes' };

/** One item of today's set, as the route answers it: the question without its key, the code highlighted. */
export const reviewItem = (id: string, course: LearnLessonLink = algorithms): ReviewItemShown => ({
  id,
  course,
  question: { ...reviewQuestion, id: `${reviewQuestion.id}-${id}` },
  highlighted: hasDuplicateCodes,
});

/** The next lesson to learn, once the review is done. */
export const reviewNext: ReviewNext = { kind: 'lesson', link: { slug: 'sliding-window', title: 'Sliding window' } };

/** Today's set: six lessons from two courses, nothing more due. */
export const reviewSide: ReviewSide = {
  items: [
    reviewItem('r1'),
    reviewItem('r2'),
    reviewItem('r3', sql),
    reviewItem('r4'),
    reviewItem('r5', sql),
    reviewItem('r6'),
  ],
  more: 0,
  nextReviewAt: null,
  nextReviewLessons: 0,
  next: reviewNext,
  mainLanguage: null,
};

/** Ten lessons, with fourteen more due. */
export const reviewSideMore: ReviewSide = {
  ...reviewSide,
  items: Array.from({ length: 10 }, (_, at) => reviewItem(`m${at + 1}`)),
  more: 14,
};

/** Nothing due: the next review in two days, with three lessons. */
export const reviewSideEmpty = (now: Date): ReviewSide => ({
  items: [],
  more: 0,
  nextReviewAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 6).toISOString(),
  nextReviewLessons: 3,
  next: reviewNext,
  mainLanguage: null,
});

/** The call's reply to an answer: the key, the lesson it was, and what changed. */
export const reviewReply = (change: LearnReviewAnswered['change'], right = change !== 'BACK_TOMORROW') => ({
  right,
  question: reviewQuestionKeyed,
  lesson: hashSets,
  change,
});

/** The end's list of six: three Practised now, one Mastered now, two back tomorrow. */
export const reviewDone: ReviewDone[] = [
  { lesson: hashSets, course: algorithms, change: 'PRACTISED' },
  { lesson: twoPointers, course: algorithms, change: 'BACK_TOMORROW' },
  { lesson: joins, course: sql, change: 'PRACTISED' },
  { lesson: bigO, course: algorithms, change: 'MASTERED' },
  { lesson: indexes, course: sql, change: 'BACK_TOMORROW' },
  { lesson: stacks, course: algorithms, change: 'PRACTISED' },
];

/** A full sitting of ten, as the end lists it when more are due. */
export const reviewDoneTen: ReviewDone[] = [...reviewDone, ...reviewDone.slice(0, 4)].map((done, at) => ({
  ...done,
  lesson: at < 6 ? done.lesson : { slug: `${done.lesson.slug}-${at}`, title: `${done.lesson.title}, part 2` },
}));
