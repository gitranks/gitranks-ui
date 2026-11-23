import type { LearnCourseCard, LearnCourseMineCard } from '../course';
import type { LearnHomeRead } from '../home';
import { type TryLesson, tryLessonOf } from '../landing';
import type { LearnSetupRead } from '../setup';
import { courseCards } from './course';
import { outputExampleCodes, outputLesson, outputQuestionCodes, setExampleCodes, setLesson } from './lesson-page';

/*
 * Learn home (page 3) and the landing (page 4), as their boards draw them: fixture courses, never a real one.
 */

/** The clock the boards are drawn at (the catalogue's): Wednesday 28 Oct 2026, noon UTC. */
export const HOME_NOW = '2026-10-28T12:00:00.000Z';

const cardOf = (slug: string) => courseCards.find((course) => course.slug === slug) as LearnCourseCard;
const others = (...started: string[]) => courseCards.filter((course) => !started.includes(course.slug));

const mine = (slug: string, patch: Partial<LearnCourseMineCard>): LearnCourseMineCard => ({
  course: cardOf(slug),
  learned: 0,
  practised: 0,
  mastered: 0,
  known: 0,
  due: 0,
  next: null,
  finishedAt: null,
  ...patch,
});

const NEXT = { slug: 'count-things-with-a-hash-map', title: 'Count things with a hash map' };
const NEXT_GO = { slug: 'a-slice-is-a-view-of-an-array', title: 'A slice is a view of an array' };

const empty: LearnHomeRead = {
  highlight: null,
  next: null,
  nextCourse: null,
  due: 0,
  repeatedToday: 0,
  learnedToday: 0,
  nextReviewAt: null,
  nextReviewLessons: 0,
  courses: [],
  learned: 0,
  practised: 0,
  mastered: 0,
  otherCourses: [],
  suggested: [],
};

/** A normal day, nothing done yet: lessons are due, so the review has the highlight. */
export const homeDay: LearnHomeRead = {
  ...empty,
  highlight: 'REVIEW',
  next: NEXT,
  due: 6,
  nextReviewAt: '2026-11-02T08:00:00.000Z',
  nextReviewLessons: 3,
  courses: [
    mine('algorithms', { learned: 10, practised: 3, mastered: 1, due: 4, next: NEXT }),
    mine('go', { learned: 3, practised: 1, due: 2, next: NEXT_GO }),
  ],
  learned: 13,
  practised: 4,
  mastered: 1,
  otherCourses: others('algorithms', 'go'),
};

/** Nothing due today: the next lesson has the highlight; the review says when the next ones come. */
export const homeNothingDue: LearnHomeRead = {
  ...homeDay,
  highlight: 'NEXT_LESSON',
  due: 0,
  courses: homeDay.courses.map((course) => ({ ...course, due: 0 })),
};

/** The review done for today. */
export const homeDoneToday: LearnHomeRead = { ...homeNothingDue, repeatedToday: 6 };

/** The first days: lessons learned, none come back yet. */
export const homeFirstDays: LearnHomeRead = {
  ...homeNothingDue,
  nextReviewAt: '2026-10-31T08:00:00.000Z',
  courses: [mine('algorithms', { learned: 4, next: NEXT })],
  learned: 4,
  practised: 0,
  mastered: 0,
  otherCourses: others('algorithms'),
};

/** Every course started is finished: the next course to pick, the review still due. */
export const homeCoursesDone: LearnHomeRead = {
  ...homeDay,
  highlight: 'REVIEW',
  next: null,
  nextCourse: { slug: 'databases', title: 'Databases and SQL' },
  courses: [
    mine('algorithms', {
      learned: 86,
      practised: 32,
      mastered: 18,
      due: 4,
      finishedAt: '2026-10-20T10:00:00.000Z',
    }),
    mine('go', { learned: 104, practised: 41, mastered: 9, due: 2, finishedAt: '2026-10-25T10:00:00.000Z' }),
  ],
  learned: 190,
  practised: 73,
  mastered: 27,
  otherCourses: others('algorithms', 'go'),
};

/** Every course we have is finished, and nothing is due: both boxes are quiet. */
export const homeAllDone: LearnHomeRead = {
  ...empty,
  nextReviewAt: '2026-11-09T08:00:00.000Z',
  nextReviewLessons: 12,
  courses: courseCards
    .slice(0, 2)
    .map((course) =>
      mine(course.slug, { learned: course.lessons, practised: 20, finishedAt: '2026-10-20T10:00:00.000Z' }),
    ),
  learned: 150,
  practised: 40,
  otherCourses: [],
};

/** A new learner, just set up: three suggested courses in the boxes' place. */
export const homeNewLearner: LearnHomeRead = {
  ...empty,
  otherCourses: courseCards,
  suggested: [
    { course: cardOf('go'), reason: 'main-language' },
    { course: cardOf('algorithms'), reason: 'most-start' },
    { course: cardOf('python'), reason: 'other-language' },
  ],
};

/** An API that has no course yet: nothing to suggest and nothing to list. */
export const homeNoCourses: LearnHomeRead = empty;

/** The setup the new learner saved: Go and Python, experienced developer. */
export const homeSetup: Pick<LearnSetupRead, 'mainLanguage' | 'otherLanguages' | 'level'> = {
  mainLanguage: 'Go',
  otherLanguages: ['Python'],
  level: 3,
};

/** The lessons the landing offers at the top: the first lesson of two topic courses. */
export const tryLessons: TryLesson[] = [
  tryLessonOf({
    lesson: setLesson,
    examples: [{ name: 'main', codes: setExampleCodes }],
    questionCodes: [],
  }),
  tryLessonOf({
    lesson: outputLesson,
    examples: [{ name: 'main', codes: outputExampleCodes }],
    questionCodes: outputQuestionCodes,
  }),
];

/** The courses on launch day: no numbers yet, so a row shows its lessons alone. */
export const launchCourses: LearnCourseCard[] = courseCards.map((course) => ({
  ...course,
  numbers: { learners: null, goodShare: null },
}));
