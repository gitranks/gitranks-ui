import type { AnswerPartPlace } from '@/components/learn/question/answer-part';
import { type LearnPicked, type LearnQuestionType, openNoteOf } from '@/lib/learn/learn-question';

/**
 * The three places that ask, as their boards draw them. Each sets only what differs: its extra choice, whether a
 * verdict shows, the button's words, and what the status slot says before an answer.
 */

/** A lesson: its own question, graded on the page; a wrong pick shows why, and the person picks again. */
export function lessonPlace(done: string): AnswerPartPlace {
  return {
    verdict: true,
    labels: { check: 'Check', done },
    note: (type, picked) =>
      type === 'MYTH_OR_FACT'
        ? openNoteOf(type, picked)
        : `${openNoteOf(type, picked)} A wrong pick only shows you why, and you pick again.`,
  };
}

/** The review: one answer a lesson, graded by the call; "I don't remember" answers in one press. */
export function reviewPlace(last: boolean): AnswerPartPlace {
  return {
    verdict: true,
    extra: 'I don’t remember',
    extraAnswers: true,
    withCode: true,
    labels: { check: 'Check', done: last ? 'Finish the review' : 'Next lesson' },
    note: (type, picked) =>
      type === 'MYTH_OR_FACT'
        ? openNoteOf(type, picked)
        : `${openNoteOf(type, picked)} Your first pick is the one that counts.`,
  };
}

/** What to do on the check, by kind, before the words every check question shares. */
const CHECK_PICK: Record<LearnQuestionType, string> = {
  PICK_ONE: 'Pick one.',
  PICK_ALL: 'Pick every one that is true.',
  PREDICT_OUTPUT: 'Pick what the code prints.',
  PICK_LINE: 'Click a line in the code, or press its number.',
  PUT_IN_ORDER: 'Put the rows in order.',
  MYTH_OR_FACT: 'Pick myth or fact.',
};

/** The check: no verdict until the result; "I don't know" is picked like an option, and the main button goes on. */
export function checkPlace(last: boolean): AnswerPartPlace {
  return {
    verdict: false,
    extra: 'I don’t know',
    withCode: true,
    labels: { check: last ? 'See the result' : 'Next question', done: last ? 'See the result' : 'Next question' },
    note: (type: LearnQuestionType, _picked: LearnPicked | null) =>
      `${CHECK_PICK[type]} We do not say right or wrong here: you see it all on the result.`,
  };
}
