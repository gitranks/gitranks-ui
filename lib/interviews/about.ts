import type { Route } from 'next';

import { INTERVIEWS_HOME_PATH, INTERVIEWS_MINE_PATH } from './paths';
import type { InterviewsBar } from './types';

/*
 * How it works, as the approved design writes it: one page for everyone. What a plan is in two sentences and three
 * steps; where the facts come from as six short points in one format; what is kept about a person in one paragraph;
 * questions; one button. It never says how often the facts are checked, what checking them costs or which tools do
 * it: that is how the work is done inside, not what a person needs.
 */

/** What a plan is, in two sentences: the page's lead and its description. */
export const ABOUT_LEAD =
  'A plan follows the real rounds of one company’s interview, in order. For each round it gives you short lessons to learn and small projects to build with your own agent.';

/** A plan, step by step. */
export const ABOUT_STEPS: readonly { title: string; text: string }[] = [
  {
    title: 'Pick a company and a position',
    text: 'Each plan is one real interview: its rounds, how long they take and what they check.',
  },
  {
    title: 'Prepare round by round',
    text: 'Short lessons with one question each, and small projects you build with your own agent.',
  },
  { title: 'Go in any order', text: 'Nothing is locked, and what you learned before already counts.' },
];

/** Where the facts come from: six points, each a small heading and one paragraph. */
export const ABOUT_FACTS: readonly { title: string; text: string }[] = [
  {
    title: 'The company states',
    text: 'The company says it itself: on its careers pages, in its blog or in its own videos.',
  },
  {
    title: 'Candidates report',
    text: 'People who went through the interview wrote about it in public. We take a fact only when at least two reports from the last two years say the same, and they do not come from one place.',
  },
  {
    title: 'Every fact shows its sources',
    text: 'Each fact says who states it: the company, candidates, or both. One press opens its sources, each with the day we read it.',
  },
  {
    title: 'In our own words',
    text: 'We write every fact in our own words. We do not copy interview questions.',
  },
  {
    title: 'Checked again',
    text: 'We check the facts again regularly. Every page of a company says the day its facts were last checked, and a fact whose newest source is more than two years old is taken down.',
  },
  {
    title: 'Not official',
    text: 'These pages are not official, and no company takes part in them. A company’s logo and name only say whose interview it is.',
  },
];

/** What is kept about the person, in one paragraph. */
export const ABOUT_KEPT =
  'We keep which plans you started and what you finished in them. Your interview plans are not publicly visible. They are not on your profile, on your Skills page or in a share picture.';

/** The questions, each opening its answer in place. */
export const ABOUT_QUESTIONS: readonly { question: string; answer: string }[] = [
  {
    question: 'Is a plan official?',
    answer:
      'No. A plan is made from what the company states and what candidates report. No company takes part in it, and every page of a company says so.',
  },
  {
    question: 'Does anyone see which interview I prepare for?',
    answer:
      'Your interview plans are not publicly visible. They are not on your profile, on your Skills page or in a share picture.',
  },
  {
    question: 'Do the lessons of a plan count in Learn?',
    answer:
      'Yes. A lesson you learn in a plan is learned in Learn too. It is not repeated while its course is not started. When you start that course, these lessons come back to repeat three days later.',
  },
  {
    question: 'What if a fact is wrong?',
    answer: 'Press “This is wrong” under it and say in a few words what is wrong.',
  },
  {
    question: 'What does it cost?',
    answer: 'Nothing. Interviews is free.',
  },
  {
    question: 'Why is my company not here?',
    answer:
      'We add a company only when enough public sources describe its interview, and we add them one at a time. A position with too few sources is left out for the same reason.',
  },
];

/** The one button at the end: to the companies, or back to the person's plans for someone who has plans. */
export function aboutButtonOf(bar: InterviewsBar | null | undefined): { label: string; href: Route } {
  return bar?.mine === true
    ? { label: 'Back to your plans', href: INTERVIEWS_MINE_PATH }
    : { label: 'See the companies', href: INTERVIEWS_HOME_PATH };
}
