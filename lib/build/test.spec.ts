import { describe, expect, it } from 'vitest';

import { buildBuilt, buildGoldEarned, buildGoldOpen, buildInProgress, buildTestLeft } from './__fixtures__/builds';
import { mcpServerStep } from './__fixtures__/project';
import {
  endTestFailed,
  endTestOpen,
  endTestPassed,
  failedResult,
  goldTestReady,
  passedResult,
} from './__fixtures__/test';
import {
  endTestAllRight,
  endTestClosed,
  endTestCode,
  endTestFailedAgain,
  endTestFailedCode,
  endTestNoneRight,
  goldTestClosed,
  goldTestFailed,
  goldTestPassed,
  mineBuilt,
  predictQuestion,
  predictQuestionKeyed,
  testResultOf,
  testRunCode,
} from './__fixtures__/test-pages';
import {
  answerGroupsOf,
  answerRowsOf,
  buildTestViewOf,
  closedWordsOf,
  countWordOf,
  dayOf,
  FAILED_TEST_ACTION,
  goingWordsOf,
  goOnLabelOf,
  momentOf,
  rightWordsOf,
  scoreTextOf,
  scoreTitleOf,
  testBoxOf,
  testBuildOf,
  testNextLabelOf,
  testNoteOf,
  testRuleOf,
  testStandingOf,
} from './test';
import type { BuildTestResult } from './types';
import { plainCodeOf } from '@/lib/workspace/code-tokens';

const NOW = new Date('2026-11-26T12:00:00.000Z');
/** The parts later work brings (the gold test's email, Skills' Built section), once they are there. */
const ON = { emails: true, skills: true };
const PROJECT = { name: 'Build an MCP server' };
const resultOf = (test: { last: BuildTestResult | null }) => test.last as BuildTestResult;

describe('which view a test shows', () => {
  it('opens a run in progress on its next question', () => {
    expect(buildTestViewOf(endTestOpen)).toEqual({ kind: 'question', run: endTestOpen.open });
    expect(buildTestViewOf(endTestCode).kind).toBe('question');
  });

  it('shows the last result when no run is open, even when a new run could start', () => {
    expect(buildTestViewOf(endTestPassed)).toEqual({ kind: 'result', result: passedResult });
    expect(buildTestViewOf(endTestFailedAgain).kind).toBe('result');
  });

  it('starts a run at once with no run and no result, and says why when none can start', () => {
    expect(buildTestViewOf(goldTestReady)).toEqual({ kind: 'start' });
    expect(buildTestViewOf(endTestClosed)).toEqual({ kind: 'closed' });
  });

  it('takes the build of the test’s language', () => {
    const mine = {
      builds: [buildInProgress, { ...buildTestLeft, language: 'python' as const }],
      agentConnected: true,
      say: '',
    };
    expect(testBuildOf(mine, { language: 'python' })?.build).toBe(buildTestLeft.build);
    expect(testBuildOf(mine, { language: 'typescript' })).toBe(buildInProgress);
    expect(testBuildOf(null, { language: 'typescript' })).toBeNull();
  });
});

describe('a question', () => {
  it('says the rule above the card: 7 makes it Built, 8 earns the gold mark', () => {
    expect(testRuleOf(endTestOpen, 10)).toEqual({
      lead: '10 questions about what you built. 7 right makes the project ',
      mark: 'Built',
      tail: '.',
    });
    expect(testRuleOf(goldTestReady, 10).lead).toContain('8 right earns the ');
    expect(testRuleOf(goldTestReady, 10).mark).toBe('gold mark');
  });

  it('never says right or wrong, and says a pick can change', () => {
    expect(testNoteOf('PICK_ONE', null, false)).toBe(
      'Pick one. We do not say right or wrong here: you see it all on the result.',
    );
    expect(testNoteOf('PREDICT_OUTPUT', null, false)).toMatch(/^Pick what the code prints\./);
    const picked = 'Picked. You can change it until you go on. Right or wrong shows on the result.';
    expect(testNoteOf('PICK_ONE', 2, false)).toBe(picked);
    expect(testNoteOf('PICK_ONE', null, true)).toBe(picked);
  });

  it('finishes the test on the last question', () => {
    expect(testNextLabelOf(false)).toBe('Next question');
    expect(testNextLabelOf(true)).toBe('Finish the test');
  });
});

describe('the score', () => {
  it('says what it means, for each test passed or not', () => {
    expect(scoreTitleOf(endTestPassed, passedResult)).toBe('9 of 10. It is Built.');
    expect(scoreTitleOf(endTestFailedAgain, failedResult)).toBe('6 of 10. 7 are needed.');
    expect(scoreTitleOf(goldTestPassed, resultOf(goldTestPassed))).toBe('8 of 10. You earned the gold mark.');
    expect(scoreTitleOf(goldTestFailed, resultOf(goldTestFailed))).toBe('7 of 10. 8 are needed for gold.');
  });

  it('never shows a zero', () => {
    expect(scoreTitleOf(endTestNoneRight, resultOf(endTestNoneRight))).toBe('None of the 10 right. 7 are needed.');
    expect(scoreTextOf(endTestNoneRight, resultOf(endTestNoneRight), PROJECT)).toBe(
      'Seven more right answers make “Build an MCP server” Built. Nothing is lost: your steps stay done.',
    );
  });

  it('says the sentence under it', () => {
    expect(scoreTextOf(endTestPassed, passedResult, PROJECT, ON)).toBe(
      'You needed 7. “Build an MCP server” now shows on your Skills page.',
    );
    expect(scoreTextOf(endTestFailedAgain, failedResult, PROJECT)).toBe(
      'One more right answer makes “Build an MCP server” Built. Nothing is lost: your steps stay done.',
    );
    expect(scoreTextOf(goldTestPassed, resultOf(goldTestPassed), PROJECT, ON)).toBe(
      'A week after you built it, you still know it. Your Skills page now shows “Build an MCP server” as repeated.',
    );
    expect(scoreTextOf(goldTestFailed, resultOf(goldTestFailed), PROJECT)).toBe(
      'The project stays Built. The gold mark only needs one more right answer.',
    );
    expect(scoreTextOf(endTestFailedAgain, testResultOf('r', [1, 2, 3, 4, 5]), PROJECT)).toMatch(
      /^Two more right answers make/,
    );
  });

  it('says nothing of the Skills page until its Built section is there', () => {
    expect(scoreTextOf(endTestPassed, passedResult, PROJECT)).toBe('You needed 7.');
    expect(scoreTextOf(goldTestPassed, resultOf(goldTestPassed), PROJECT)).toBe(
      'A week after you built it, you still know it.',
    );
  });
});

describe('the answers', () => {
  it('put the wrong ones first, each with the pick, the right answer, the reason and its step', () => {
    const { wrong, right } = answerGroupsOf(failedResult, 'typescript');
    expect(wrong.map((row) => row.number)).toEqual([2, 5, 8, 9]);
    expect(right).toHaveLength(6);
    expect(wrong[0]).toMatchObject({
      prompt: 'What does your agent read to decide when to use a tool?',
      picked: 'Only the name of the tool',
      right: 'The description in the list',
      why: 'The description is written for the agent; it says what the tool is for.',
      step: { number: 7, slug: 'list-the-tools' },
      isRight: false,
    });
  });

  it('say "I don’t know" as a pick of none', () => {
    const row = answerGroupsOf(failedResult, 'typescript').wrong.find((item) => item.number === 8);
    expect(row?.picked).toBeNull();
  });

  it('name an option by its place in the run’s order', () => {
    const result: BuildTestResult = {
      run: 'r',
      right: 0,
      passed: false,
      items: [{ question: predictQuestionKeyed, pick: 2, step: mcpServerStep(7) }],
    };
    expect(answerRowsOf(result, 'typescript')[0]).toMatchObject({
      picked: 'The list it got the last time',
      right: 'A list with no tools: the server works and offers nothing',
      mono: true,
      isRight: false,
    });
  });

  it('draw the code a question asked about, as its card drew it, with the colours the server gave', () => {
    const rows = answerRowsOf(resultOf(endTestFailedCode), 'typescript');
    const code = rows.find((row) => row.number === 7)?.code;
    expect(code).toEqual(endTestFailedCode.last?.highlighted?.[predictQuestion.id]?.[0]);
    expect(code?.language).toBe('typescript');
    expect(rows.filter((row) => row.code)).toHaveLength(1);
    expect(rows.find((row) => row.number === 7)?.isRight).toBe(false);
  });

  it('draw the code plain when the server sent no colours, and none for a question with no code', () => {
    const plain = { ...resultOf(endTestFailedCode), highlighted: undefined };
    const row = answerRowsOf(plain, 'typescript').find((item) => item.number === 7);
    expect(row?.code).toEqual(plainCodeOf(predictQuestion.codes.find((code) => code.language === 'typescript')!));
    expect(answerRowsOf(failedResult, 'typescript').every((item) => item.code === null)).toBe(true);
  });

  it('leave the first list out when nothing is wrong', () => {
    const { wrong, right } = answerGroupsOf(resultOf(endTestAllRight), 'typescript');
    expect(wrong).toEqual([]);
    expect(right).toHaveLength(10);
  });
});

describe('what comes now', () => {
  it('after a pass: open the project and share, and when the gold test opens', () => {
    expect(testBoxOf(endTestPassed, passedResult, buildBuilt, NOW, 'UTC', ON)).toEqual({
      title: 'What comes now',
      aside: null,
      pills: ['every-step'],
      text: 'The gold test opens on 3 Dec, a week from today: 10 questions, and 8 right earns the gold mark. We will email you that day.',
      main: { kind: 'project' },
      share: true,
    });
    expect(testBoxOf(endTestPassed, passedResult, buildBuilt, NOW, 'UTC').text).toBe(
      'The gold test opens on 3 Dec, a week from today: 10 questions, and 8 right earns the gold mark.',
    );
    const later = testBoxOf(endTestPassed, passedResult, buildBuilt, new Date('2026-11-29T12:00:00Z'), 'UTC');
    expect(later.text).toMatch(/^The gold test opens on 3 Dec: /);
  });

  it('after a pass with the gold test open, its button is the main one', () => {
    const box = testBoxOf(endTestPassed, passedResult, buildGoldOpen, NOW, 'UTC');
    expect(box.main).toEqual({ kind: 'gold' });
    expect(box.text).toMatch(/^The gold test is open now/);
  });

  it('after a pass with the build not read, says only what it knows', () => {
    const box = testBoxOf(endTestPassed, passedResult, null, NOW, 'UTC');
    expect(box.pills).toEqual([]);
    expect(box.text).toBeNull();
  });

  it('after the gold test passed: the gold mark and every step', () => {
    expect(testBoxOf(goldTestPassed, resultOf(goldTestPassed), buildGoldEarned, NOW, 'UTC')).toMatchObject({
      pills: ['repeated', 'every-step'],
      main: { kind: 'project' },
      share: true,
    });
  });

  it('after a fail: look at the wrong ones and take it again, at once', () => {
    expect(testBoxOf(endTestFailedAgain, failedResult, buildTestLeft, NOW, 'UTC')).toEqual({
      title: 'Look at the four below, then take it again',
      aside: null,
      pills: [],
      text: 'Each wrong answer has its reason and the step it comes from. The next test asks other questions, and you can take it as often as you like.',
      main: { kind: 'again', label: 'Take the test again', ready: true },
      share: false,
    });
  });

  it('after a failed end test: no next-try time, since the end test can start again at once', () => {
    expect(endTestFailed).toMatchObject({ canStart: true, nextTryAt: null });
    expect(testBoxOf(endTestFailed, failedResult, buildTestLeft, NOW, 'UTC')).toEqual(
      testBoxOf(endTestFailedAgain, failedResult, buildTestLeft, NOW, 'UTC'),
    );
  });

  it('after the gold test failed: the button waits for the next day, and says when', () => {
    const box = testBoxOf(
      goldTestFailed,
      resultOf(goldTestFailed),
      buildBuilt,
      new Date('2026-12-03T10:00:00Z'),
      'UTC',
    );
    expect(box).toEqual({
      title: 'You can try again tomorrow',
      aside: 'One try a day',
      pills: [],
      text: 'The next gold test opens on 4 Dec at 09:14, with other questions. The three below are worth a look before then.',
      main: { kind: 'again', label: 'Take the gold test again', ready: false },
      share: false,
    });
    expect(testBoxOf(goldTestFailed, resultOf(goldTestFailed), buildBuilt, NOW, 'UTC').title).toBe(
      'You can try again on 4 Dec',
    );
  });
});

describe('what comes now, before the next try is known', () => {
  it('after a failed gold test: tomorrow, and no "take it again" beside a button that cannot be pressed', () => {
    const waiting = { ...goldTestFailed, nextTryAt: null };
    const box = testBoxOf(waiting, resultOf(goldTestFailed), buildBuilt, NOW, 'UTC');
    expect(box).toEqual({
      title: 'You can try again tomorrow',
      aside: 'One try a day',
      pills: [],
      text: 'The next gold test opens tomorrow, with other questions. The three below are worth a look before then.',
      main: { kind: 'again', label: 'Take the gold test again', ready: false },
      share: false,
    });
  });

  it('after a failed end test that cannot start now: no "take it again" either', () => {
    const box = testBoxOf({ ...endTestFailedAgain, canStart: false }, failedResult, buildTestLeft, NOW, 'UTC');
    expect(box.title).toBe('Look at the four below before you try again');
    expect(box.main).toEqual({ kind: 'again', label: 'Take the test again', ready: false });
  });
});

describe('a test that cannot start', () => {
  it('before the last step: where the build is, and the way back', () => {
    expect(closedWordsOf(endTestClosed, buildInProgress)).toEqual({
      title: 'The test comes after the last step',
      text: 'Your build is on step 9 of 16. Finish the base in your agent, and the test opens here.',
    });
    expect(closedWordsOf(endTestClosed, null).text).toBe('Finish the base in your agent, and the test opens here.');
  });

  it('the gold test before its day: the day it opens', () => {
    expect(closedWordsOf(goldTestClosed, buildBuilt, 'UTC', ON)).toEqual({
      title: 'The gold test opens on 3 Dec',
      text: 'It opens a week after you built the project. We will email you that day.',
    });
    // Until the email is there, the page does not promise it.
    expect(closedWordsOf(goldTestClosed, buildBuilt).text).toBe('It opens a week after you built the project.');
    expect(closedWordsOf(goldTestClosed, testBuildOf(mineBuilt, goldTestClosed)).title).toBe(
      'The gold test opens on 3 Dec',
    );
  });

  it('the gold test before the test is passed', () => {
    expect(closedWordsOf(goldTestClosed, buildTestLeft).title).toBe('The gold test comes after the test');
  });
});

describe('the words', () => {
  it('count in words, and write days and times as the boards do', () => {
    expect([1, 3, 4, 10, 12].map(countWordOf)).toEqual(['one', 'three', 'four', 'ten', '12']);
    expect(dayOf('2026-12-03')).toBe('3 Dec');
    expect(momentOf('2026-12-04T09:14:00.000Z', 'UTC')).toEqual({ day: '4 Dec', time: '09:14' });
    expect(momentOf('not a date')).toBeNull();
  });
});

describe('where a test stands, as the boxes outside the test say it', () => {
  it('a run in progress: the question the person was on', () => {
    expect(testStandingOf(endTestOpen)).toEqual({ kind: 'going', answered: 3, count: 10 });
    expect(testStandingOf(endTestCode)).toEqual({ kind: 'going', answered: 6, count: 10 });
    expect(testStandingOf({ ...goldTestReady, open: testRunCode })).toEqual({ kind: 'going', answered: 6, count: 10 });
  });

  it('a failed end test: its score and what is needed', () => {
    expect(testStandingOf(endTestFailed)).toEqual({ kind: 'failed', right: 6, count: 10, need: 7 });
    expect(testStandingOf(endTestFailedCode)).toEqual({ kind: 'failed', right: 5, count: 10, need: 7 });
  });

  it('nothing to say for a test not begun, passed, a failed gold test, or nothing read', () => {
    expect(testStandingOf(endTestPassed)).toBeNull();
    expect(testStandingOf(goldTestReady)).toBeNull();
    expect(testStandingOf(goldTestFailed)).toBeNull();
    // A new run started from the result and left before its first answer: the test's page opens on question 1,
    // so the boxes offer the test as for a first try, not the answers.
    expect(testStandingOf({ ...endTestFailed, open: { ...testRunCode, answered: 0 } })).toBeNull();
    expect(testStandingOf(null)).toBeNull();
  });

  it('says a score as a sentence does, never a zero', () => {
    expect(rightWordsOf(3, 10)).toBe('3 of 10 right');
    expect(rightWordsOf(0, 10)).toBe('none of the 10 right');
  });

  it('says where a run stopped, and what is kept', () => {
    expect(goingWordsOf({ answered: 3, count: 10 })).toEqual({
      where: 'You were on question 4 of 10',
      kept: 'Your first three answers are kept. Go on from question 4.',
    });
    expect(goingWordsOf({ answered: 1, count: 10 }).kept).toBe('Your first answer is kept. Go on from question 2.');
    expect(goOnLabelOf('end')).toBe('Go on with the test');
    expect(goOnLabelOf('gold')).toBe('Go on with the gold test');
    expect(FAILED_TEST_ACTION).toBe('See your answers and try again');
  });
});
