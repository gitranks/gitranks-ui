import { BUILD_EMAILS_BUILT, BUILD_SKILLS_BUILT } from './built-parts';
import type {
  BuildMine,
  BuildProjectMine,
  BuildStepRef,
  BuildTest,
  BuildTestAnswer,
  BuildTestKind,
  BuildTestResult,
  BuildTestRun,
} from './types';
import { dayKeyIn, daysFromTo, dayWordsIn, timeWordsIn } from './zone';
import { type HighlightedCode, plainCodeOf } from '@/lib/workspace/code-tokens';
import {
  codeOf,
  type LearnPicked,
  type LearnQuestion,
  type LearnQuestionType,
  linesOf,
  optionsOf,
  rightOf,
  rightWhyOf,
} from '@/lib/workspace/learn-question';

/*
 * The two tests of a build, and their result, in words and rules that need no screen: which view the page shows, the
 * line above each question, the score and what it means, the box with what comes now, and the answers split into the
 * wrong ones and the right ones. The live page and the catalogue read the same rules.
 */

/** A run as the page draws it: each question with code also carries it highlighted on the server, by question id. */
export type BuildTestRunShown = BuildTestRun & { highlighted?: Record<string, HighlightedCode[]> };

/** A result as the page draws it: each answer whose question has code also carries it highlighted, by question id. */
export type BuildTestResultShown = BuildTestResult & { highlighted?: Record<string, HighlightedCode[]> };

/** A test as the page reads it: its open run and its last result with the code highlighted. */
export type BuildTestShown = Omit<BuildTest, 'open' | 'last'> & {
  open: BuildTestRunShown | null;
  last: BuildTestResultShown | null;
};

/** An answer as the page reads it: with the tenth, the result with its code highlighted. */
export type BuildTestAnswerShown = Omit<BuildTestAnswer, 'result'> & { result: BuildTestResultShown | null };

/** What the strip calls each test. */
export const TEST_NAMES: Record<BuildTestKind, string> = { end: 'The test', gold: 'The gold test' };

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A small count in words ("four"); a larger one in figures. */
export const countWordOf = (count: number): string => WORDS[count] ?? String(count);

/** What the page shows for a test as it was read. */
export type BuildTestView =
  /** A run in progress: its next question. */
  | { kind: 'question'; run: BuildTestRunShown }
  /** The last run's result, with no run open. */
  | { kind: 'result'; result: BuildTestResultShown }
  /** No run and no result, and a run can start: it starts at once, with no start page. */
  | { kind: 'start' }
  /** No run, no result, and none can start: the page says why and leads back to the project. */
  | { kind: 'closed' };

export function buildTestViewOf(test: BuildTestShown): BuildTestView {
  const { open, last } = test;
  if (open && open.answered < open.questions.length) return { kind: 'question', run: open };
  if (last) return { kind: 'result', result: last };
  if (test.canStart) return { kind: 'start' };
  return { kind: 'closed' };
}

/**
 * The person's build that the test is of: the one in the test's language, or none. The API answers in the language of
 * the build it picked (the one touched last when `?language=` names none), so the test's language is the build's.
 */
export function testBuildOf(mine: BuildProjectMine | null, test: Pick<BuildTest, 'language'>): BuildMine | null {
  if (!mine?.builds.length) return null;
  return mine.builds.find((build) => build.language === test.language) ?? null;
}

/** The line above each question: how many questions, and how many right pass. The mark is set apart. */
export function testRuleOf(test: Pick<BuildTest, 'kind' | 'need'>, count: number) {
  return test.kind === 'gold'
    ? { lead: `${count} questions about what you built. ${test.need} right earns the `, mark: 'gold mark', tail: '.' }
    : {
        lead: `${count} questions about what you built. ${test.need} right makes the project `,
        mark: 'Built',
        tail: '.',
      };
}

/** What to do, by kind, before the words every test question shares. */
const TEST_PICK: Record<LearnQuestionType, string> = {
  PICK_ONE: 'Pick one.',
  PICK_ALL: 'Pick every one that is true.',
  PREDICT_OUTPUT: 'Pick what the code prints.',
  PICK_LINE: 'Click a line in the code, or press its number.',
  PUT_IN_ORDER: 'Put the rows in order.',
  MYTH_OR_FACT: 'Pick myth or fact.',
};

/** What the status slot says on a test's question: no right or wrong, and a pick that can change. */
export function testNoteOf(type: LearnQuestionType, picked: LearnPicked | null, extra: boolean): string {
  const has = extra || (Array.isArray(picked) ? picked.length > 0 : picked !== null);
  return has
    ? 'Picked. You can change it until you go on. Right or wrong shows on the result.'
    : `${TEST_PICK[type]} We do not say right or wrong here: you see it all on the result.`;
}

/** The main button of a question: the last one finishes the test. */
export const testNextLabelOf = (last: boolean) => (last ? 'Finish the test' : 'Next question');

/** One answer of a result, as its row says it. `picked` null: "I don't know". */
export type BuildTestAnswerRow = {
  /** The question's place in the run, from 1. */
  number: number;
  prompt: string;
  picked: string | null;
  right: string;
  why: string | null;
  step: BuildStepRef;
  /** The question's code, as its card drew it: highlighted when the server could, else plain; none without code. */
  code: HighlightedCode | null;
  /** The options are code's output: set in mono. */
  mono: boolean;
  isRight: boolean;
};

/**
 * A question's code in the test's language, as its card drew it: the server's colours when they count the same lines
 * as the code, else the plain code. None for a question with no code.
 */
function codeLinesOf(
  question: LearnQuestion,
  language: string | null,
  highlighted: readonly HighlightedCode[] | undefined,
): HighlightedCode | null {
  const code = codeOf(question, language);
  if (!code) return null;
  const found = highlighted?.find((entry) => entry.language === code.language);
  return found && found.lines.length === linesOf(code.code).length ? found : plainCodeOf(code);
}

/** Each answer of a result, in the run's order. A pick names an option by its place in the run's order. */
export function answerRowsOf(result: BuildTestResultShown, language: string | null): BuildTestAnswerRow[] {
  return result.items.map((item, index) => {
    const options = optionsOf(item.question);
    const right = rightOf(item.question, language);
    const rights = right?.kind === 'options' ? right.indexes : [];
    return {
      number: index + 1,
      prompt: item.question.prompt,
      picked: item.pick === null ? null : (options[item.pick]?.text ?? null),
      right: rights.map((at) => options[at]?.text ?? '').join(' and '),
      why: rightWhyOf(item.question, language),
      step: item.step,
      code: codeLinesOf(item.question, language, result.highlighted?.[item.question.id]),
      mono: item.question.type === 'PREDICT_OUTPUT',
      isRight: item.pick !== null && rights.includes(item.pick) && rights.length === 1,
    };
  });
}

/** The answers split: the wrong ones first and open, the right ones folded. A list with none is not drawn. */
export function answerGroupsOf(result: BuildTestResultShown, language: string | null) {
  const rows = answerRowsOf(result, language);
  return { wrong: rows.filter((row) => !row.isRight), right: rows.filter((row) => row.isRight) };
}

/** The score and what it means, as the result's title says it. Never a zero. */
export function scoreTitleOf(test: Pick<BuildTest, 'kind' | 'need'>, result: BuildTestResult): string {
  const count = result.items.length;
  const score = result.right ? `${result.right} of ${count}.` : `None of the ${count} right.`;
  if (test.kind === 'gold') {
    return result.passed ? `${score} You earned the gold mark.` : `${score} ${test.need} are needed for gold.`;
  }
  return result.passed ? `${score} It is Built.` : `${score} ${test.need} are needed.`;
}

/** "One more right answer", "Two more right answers". */
const moreOf = (more: number) => (more === 1 ? 'one more right answer' : `${countWordOf(more)} more right answers`);

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The parts of Build that later work brings, which a sentence may speak of only once they are there: the gold test's
 * email and the Skills page's Built section.
 */
export type BuiltParts = { emails: boolean; skills: boolean };

const BUILT: BuiltParts = { emails: BUILD_EMAILS_BUILT, skills: BUILD_SKILLS_BUILT };

/** The sentence under the score. */
export function scoreTextOf(
  test: Pick<BuildTest, 'kind' | 'need'>,
  result: BuildTestResult,
  project: { name: string },
  built: BuiltParts = BUILT,
): string {
  const more = Math.max(1, test.need - result.right);
  if (test.kind === 'gold') {
    if (!result.passed) return `The project stays Built. The gold mark only needs ${moreOf(more)}.`;
    const skills = built.skills ? ` Your Skills page now shows “${project.name}” as repeated.` : '';
    return `A week after you built it, you still know it.${skills}`;
  }
  if (result.passed) {
    const skills = built.skills ? ` “${project.name}” now shows on your Skills page.` : '';
    return `You needed ${test.need}.${skills}`;
  }
  return `${capital(moreOf(more))} ${more === 1 ? 'makes' : 'make'} “${project.name}” Built. Nothing is lost: your steps stay done.`;
}

/** "3 Dec": a local day (`2026-12-03`) as written. */
export const dayOf = (day: string): string => dayWordsIn(day.slice(0, 10)) || day;

/** "4 Dec" and "09:14": a moment in the zone the person's days are counted in. */
export function momentOf(at: string, timeZone?: string): { day: string; time: string } | null {
  const day = dayWordsIn(at, timeZone);
  return day ? { day, time: timeWordsIn(at, timeZone) } : null;
}

/** Whole days from today to a local day (or to a moment's day), in the zone; null when either cannot be read. */
const daysFromToday = (now: Date, to: string, timeZone?: string) =>
  daysFromTo(dayKeyIn(now, timeZone), dayKeyIn(to, timeZone));

/** The marks the box shows: the gold mark ("Repeated after a week") and "Answered every step". */
export type BuildTestPill = 'repeated' | 'every-step';

/** The box's main action: open the project, take the gold test, or take the test again (ready now or not yet). */
export type BuildTestMain = { kind: 'project' } | { kind: 'gold' } | { kind: 'again'; label: string; ready: boolean };

/** The box under the score: what comes now, in one place. */
export type BuildTestBox = {
  title: string;
  aside: string | null;
  pills: BuildTestPill[];
  text: string | null;
  main: BuildTestMain;
  /** Share the project beside the main button (a pass); otherwise a link back to the project. */
  share: boolean;
};

/**
 * What comes now, from the test, its result and the person's build (null when it could not be read): a pass opens
 * the project and shares it, and says when the gold test opens; a fail says what to look at and offers the test again,
 * or says when the next try opens.
 */
export function testBoxOf(
  test: Pick<BuildTest, 'kind' | 'need' | 'canStart' | 'nextTryAt'>,
  result: BuildTestResult,
  build: BuildMine | null,
  now: Date,
  timeZone?: string,
  built: BuiltParts = BUILT,
): BuildTestBox {
  const email = built.emails ? ' We will email you that day.' : '';
  const everyStep: BuildTestPill[] = build?.answeredEveryStep ? ['every-step'] : [];
  const wrong = result.items.length - result.right;
  if (result.passed && test.kind === 'gold') {
    return {
      title: 'What comes now',
      aside: null,
      pills: ['repeated', ...everyStep],
      text: null,
      main: { kind: 'project' },
      share: true,
    };
  }
  if (result.passed) {
    const gold = build?.state.kind === 'built' ? build.state.gold : null;
    const rule = '10 questions, and 8 right earns the gold mark.';
    let text: string | null = null;
    let main: BuildTestMain = { kind: 'project' };
    let pills = everyStep;
    if (gold?.kind === 'opens_on') {
      const week = daysFromToday(now, gold.date, timeZone) === 7 ? ', a week from today' : '';
      text = `The gold test opens on ${dayOf(gold.date)}${week}: ${rule}${email}`;
    } else if (gold?.kind === 'open') {
      text = `The gold test is open now: ${rule}`;
      main = { kind: 'gold' };
    } else if (gold?.kind === 'earned') {
      pills = ['repeated', ...everyStep];
    }
    return { title: 'What comes now', aside: null, pills, text, main, share: true };
  }
  const label = test.kind === 'gold' ? 'Take the gold test again' : 'Take the test again';
  const many = wrong === 1 ? 'the one below' : `the ${countWordOf(wrong)} below`;
  const next = test.nextTryAt ? momentOf(test.nextTryAt, timeZone) : null;
  if (!test.canStart && next) {
    const days = (test.nextTryAt && daysFromToday(now, test.nextTryAt, timeZone)) || 0;
    const when = days === 1 ? 'tomorrow' : days <= 0 ? 'later today' : `on ${next.day}`;
    const worth = wrong === 1 ? 'The one below is worth a look' : `The ${countWordOf(wrong)} below are worth a look`;
    return {
      title: `You can try again ${when}`,
      aside: test.kind === 'gold' ? 'One try a day' : null,
      pills: [],
      text: `The next ${test.kind === 'gold' ? 'gold test' : 'test'} opens on ${next.day} at ${next.time}, with other questions. ${worth} before then.`,
      main: { kind: 'again', label, ready: false },
      share: false,
    };
  }
  if (!test.canStart) {
    // The day of the next try is not known yet: a failed gold test opens again on the next local day.
    const worth = wrong === 1 ? 'The one below is worth a look' : `The ${countWordOf(wrong)} below are worth a look`;
    return {
      title: test.kind === 'gold' ? 'You can try again tomorrow' : `Look at ${many} before you try again`,
      aside: test.kind === 'gold' ? 'One try a day' : null,
      pills: [],
      text:
        test.kind === 'gold'
          ? `The next gold test opens tomorrow, with other questions. ${worth} before then.`
          : 'Each wrong answer has its reason and the step it comes from. The next test asks other questions.',
      main: { kind: 'again', label, ready: false },
      share: false,
    };
  }
  return {
    title: `Look at ${many}, then take it again`,
    aside: test.kind === 'gold' ? 'One try a day' : null,
    pills: [],
    text:
      test.kind === 'gold'
        ? 'Each wrong answer has its reason and the step it comes from. The next gold test asks other questions.'
        : 'Each wrong answer has its reason and the step it comes from. The next test asks other questions, and you can take it as often as you like.',
    main: { kind: 'again', label, ready: true },
    share: false,
  };
}

/** What the page says to someone with no build of the project: the test is for a build, after its last step. */
export const NO_BUILD_WORDS = {
  title: 'You have no build of this project yet',
  text: 'The test is for your own build, after its last step. Start the project in your agent, and the test opens here once its steps are done.',
};

/** What the page says when the run in progress ran out (a run is kept for a day) and the page moved on. */
export const RUN_EXPIRED_NOTE = 'Your last test ran out after a day without its last answer, so its answers are gone.';

/** Why a test cannot start, when there is no result to show: its title and sentence. */
export function closedWordsOf(
  test: Pick<BuildTest, 'kind' | 'nextTryAt'>,
  build: BuildMine | null,
  timeZone?: string,
  built: BuiltParts = BUILT,
): { title: string; text: string } {
  if (test.kind === 'end') {
    if (build?.state.kind === 'in_progress') {
      return {
        title: 'The test comes after the last step',
        text: `Your build is on step ${build.state.step.number} of ${build.state.of}. Finish the base in your agent, and the test opens here.`,
      };
    }
    if (build?.state.kind === 'built') {
      return { title: 'There is no test to take here now', text: 'Your build of this project is Built already.' };
    }
    return {
      title: 'The test comes after the last step',
      text: 'Finish the base in your agent, and the test opens here.',
    };
  }
  const gold = build?.state.kind === 'built' ? build.state.gold : null;
  const opens =
    gold?.kind === 'opens_on' ? dayOf(gold.date) : test.nextTryAt ? momentOf(test.nextTryAt, timeZone)?.day : null;
  if (build && build.state.kind !== 'built') {
    return {
      title: 'The gold test comes after the test',
      text: 'Pass the test first. The gold test opens a week after that.',
    };
  }
  if (gold?.kind === 'earned') {
    return { title: 'You earned the gold mark already', text: 'There is no gold test left to take on this build.' };
  }
  if (opens) {
    return {
      title: `The gold test opens on ${opens}`,
      text: `It opens a week after you built the project.${built.emails ? ' We will email you that day.' : ''}`,
    };
  }
  return { title: 'The gold test is not open yet', text: 'It opens a week after you built the project.' };
}

/**
 * Where a test that waits stands, which Home, a project's box and My builds say before "Take the test": a run in
 * progress with some answers given (`going`), or, with none in progress, an end test whose last run did not pass
 * (`failed`). None for a test not started yet, and when the test could not be read. Never a zero: a run with no answer
 * is not in progress, and a score of none is said in words.
 */
export type TestStanding =
  | { kind: 'going'; answered: number; count: number }
  | { kind: 'failed'; right: number; count: number; need: number };

export function testStandingOf(test: Pick<BuildTest, 'kind' | 'need' | 'open' | 'last'> | null): TestStanding | null {
  if (!test) return null;
  const { open, last } = test;
  const count = open?.questions.length ?? 0;
  if (open && open.answered > 0 && open.answered < count) return { kind: 'going', answered: open.answered, count };
  if (test.kind === 'end' && !open?.answered && last && !last.passed) {
    return { kind: 'failed', right: last.right, count: last.items.length || 10, need: test.need };
  }
  return null;
}

/** "3 of 10 right", or "none of the 10 right": a score as a sentence says it, never a zero. */
export const rightWordsOf = (right: number, count: number): string =>
  right > 0 ? `${right} of ${count} right` : `none of the ${count} right`;

/** The words of a run in progress: where the person was, and what is kept. */
export function goingWordsOf(going: { answered: number; count: number }) {
  const next = going.answered + 1;
  return {
    /** "You were on question 4 of 10". */
    where: `You were on question ${next} of ${going.count}`,
    /** "Your first three answers are kept. Go on from question 4." */
    kept: `${going.answered === 1 ? 'Your first answer is' : `Your first ${countWordOf(going.answered)} answers are`} kept. Go on from question ${next}.`,
  };
}

/** The button that goes on with a run in progress. */
export const goOnLabelOf = (kind: BuildTestKind) =>
  kind === 'gold' ? 'Go on with the gold test' : 'Go on with the test';

/** The button that opens a failed end test's result, whose page offers the test again. */
export const FAILED_TEST_ACTION = 'See your answers and try again';

/** What a failed end test's result holds, as the boxes say it. */
export const FAILED_TEST_WORDS =
  'Each wrong answer has its reason and its step. Look at them, then take the test again when you like. The questions will be different.';
