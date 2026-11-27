import type {
  BuildMine,
  BuildProjectMine,
  BuildStepRef,
  BuildTest,
  BuildTestKind,
  BuildTestResult,
  BuildTestRun,
} from './types';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import {
  type LearnPicked,
  type LearnQuestionType,
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

/** A test as the page reads it: its open run with the code highlighted. */
export type BuildTestShown = Omit<BuildTest, 'open'> & { open: BuildTestRunShown | null };

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
  | { kind: 'result'; result: BuildTestResult }
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

/** The person's build that the test is of: the one in the test's language, or else the one touched last. */
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
  /** The options are code's output: set in mono. */
  mono: boolean;
  isRight: boolean;
};

/** Each answer of a result, in the run's order. A pick names an option by its place in the run's order. */
export function answerRowsOf(result: BuildTestResult, language: string | null): BuildTestAnswerRow[] {
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
      mono: item.question.type === 'PREDICT_OUTPUT',
      isRight: item.pick !== null && rights.includes(item.pick) && rights.length === 1,
    };
  });
}

/** The answers split: the wrong ones first and open, the right ones folded. A list with none is not drawn. */
export function answerGroupsOf(result: BuildTestResult, language: string | null) {
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

/** The sentence under the score. */
export function scoreTextOf(
  test: Pick<BuildTest, 'kind' | 'need'>,
  result: BuildTestResult,
  project: { name: string },
): string {
  const more = Math.max(1, test.need - result.right);
  if (test.kind === 'gold') {
    return result.passed
      ? `A week after you built it, you still know it. Your Skills page now shows “${project.name}” as repeated.`
      : `The project stays Built. The gold mark only needs ${moreOf(more)}.`;
  }
  if (result.passed) return `You needed ${test.need}. “${project.name}” now shows on your Skills page.`;
  return `${capital(moreOf(more))} ${more === 1 ? 'makes' : 'make'} “${project.name}” Built. Nothing is lost: your steps stay done.`;
}

/** "3 Dec": a local day (`2026-12-03`) as written. */
export function dayOf(day: string): string {
  const date = new Date(`${day.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

/** "4 Dec" and "09:14": a moment in the person's own time. */
export function momentOf(at: string, timeZone?: string): { day: string; time: string } | null {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(date),
    time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(
      date,
    ),
  };
}

/** A local day (`2026-12-03`) of a moment, in the person's own time. */
function localDayOf(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(date);
}

/** Whole days from one local day to another. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

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
): BuildTestBox {
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
      const week = daysBetween(localDayOf(now, timeZone), gold.date) === 7 ? ', a week from today' : '';
      text = `The gold test opens on ${dayOf(gold.date)}${week}: ${rule} We will email you that day.`;
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
    const days = test.nextTryAt
      ? daysBetween(localDayOf(now, timeZone), localDayOf(new Date(test.nextTryAt), timeZone))
      : 0;
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
  return {
    title: `Look at ${many}, then take it again`,
    aside: test.kind === 'gold' ? 'One try a day' : null,
    pills: [],
    text:
      test.kind === 'gold'
        ? 'Each wrong answer has its reason and the step it comes from. The next gold test asks other questions.'
        : 'Each wrong answer has its reason and the step it comes from. The next test asks other questions, and you can take it as often as you like.',
    main: { kind: 'again', label, ready: test.canStart },
    share: false,
  };
}

/** Why a test cannot start, when there is no result to show: its title and sentence. */
export function closedWordsOf(
  test: Pick<BuildTest, 'kind' | 'nextTryAt'>,
  build: BuildMine | null,
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
  const opens = gold?.kind === 'opens_on' ? dayOf(gold.date) : test.nextTryAt ? momentOf(test.nextTryAt)?.day : null;
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
      text: 'It opens a week after you built the project. We will email you that day.',
    };
  }
  return { title: 'The gold test is not open yet', text: 'It opens a week after you built the project.' };
}
