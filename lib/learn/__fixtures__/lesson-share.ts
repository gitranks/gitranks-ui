import type { LearnLesson } from '../lesson-page';
import { regexLesson, setLesson } from './lesson-page';

/** A lesson whose title is long: its picture's title gets smaller, as the design catalogue draws it. */
export const longTitleLesson: LearnLesson = {
  ...setLesson,
  slug: 'nested-repeats-are-slow',
  title: 'Why a regular expression with nested repeats can take minutes on one short line of text',
  course: { slug: 'regular-expressions', title: 'Regular expressions' },
  group: { slug: 'speed', title: 'Speed' },
};

/** The lessons the pictures of the boards are drawn from: the lesson (and its fact), a long title, a long fact. */
export const shareLessons = { lesson: setLesson, longTitle: longTitleLesson, longFact: regexLesson };
