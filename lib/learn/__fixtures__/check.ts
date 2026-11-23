import type { CheckSide, LearnCheckGroup, LearnCheckOutcome } from '../check';
import type { LearnCourseMine } from '../course';
import { algorithmsCourse } from './course';
import { checkQuestion } from './learn-question';
import { hasDuplicateCodes } from './player';

/*
 * The check's fixtures, as page 17's boards draw them: the algorithms course's run of nine questions, and its result
 * in each state (four groups right, none, all), with the lessons each proposes.
 */

const course = { slug: algorithmsCourse.slug, title: algorithmsCourse.name };

/** The run: one question for each group, the first `answered` of them answered. */
export const checkRunOf = (answered: number): CheckSide => ({
  id: 'run-1',
  course,
  questions: algorithmsCourse.groups.map((group, at) => ({
    group: { slug: group.slug, title: group.name },
    question: { ...checkQuestion, id: `${checkQuestion.id}-${group.slug}` },
    answered: at < answered,
    highlighted: hasDuplicateCodes.slice(0, 1),
  })),
  result: null,
});

/** A result from each group's outcome: a right answer proposes the whole group, nothing learned yet. */
export const checkResultOf = (outcomes: readonly LearnCheckOutcome[]): LearnCheckGroup[] =>
  algorithmsCourse.groups.map((group, at) => ({
    group: { slug: group.slug, title: group.name },
    outcome: outcomes[at] ?? 'NOT_ANSWERED',
    lessons: group.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      proposed: outcomes[at] === 'RIGHT',
      learned: false,
    })),
  }));

const R: LearnCheckOutcome = 'RIGHT';
const W: LearnCheckOutcome = 'WRONG';
const D: LearnCheckOutcome = 'DONT_KNOW';

/** Page 17's result: Big-O, arrays, hash maps and sorting right; the rest wrong or "I don't know". */
export const checkResult = checkResultOf([R, R, R, W, D, D, D, R, W]);

/** Nothing right. */
export const checkResultNone = checkResultOf([D, D, D, D, D, D, D, D, D]);

/** Every answer right. */
export const checkResultAll = checkResultOf([R, R, R, R, R, R, R, R, R]);

/** Stopped after three answers: the rest not answered. */
export const checkResultStopped = checkResultOf([R, W, D]);

/** A run that ended, as its route answers it: the result, no questions. */
export const checkEnded = (result: LearnCheckGroup[] = checkResult): CheckSide => ({
  id: 'run-1',
  course,
  questions: [],
  result,
});

/**
 * "What you know" later: Big-O and arrays marked as known, and in "Hash maps and sets" three lessons learned since,
 * the other six marked.
 */
export const knownSinceMine: Pick<LearnCourseMine, 'lessons'> = {
  lessons: algorithmsCourse.groups.slice(0, 3).flatMap((group, at) =>
    group.lessons.map((lesson, index) => {
      const learned = at === 2 && index < 3;
      return {
        slug: lesson.slug,
        depth: learned ? ('LEARNED' as const) : ('NONE' as const),
        known: !learned,
        due: false,
      };
    }),
  ),
};
