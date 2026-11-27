// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, signIn } = vi.hoisted(() => ({ hint: { present: true }, signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { BuildTestLive } = await import('./build-test-live');
const { readBuildTest, startBuildTestRun } = await import('@/lib/build/test-live');
const { endTestOpen, endTestPassed, goldTestReady, testQuestionsKeyed, passedResult, testRun, testRunFresh } =
  await import('@/lib/build/__fixtures__/test');
const {
  endTestAllRight,
  endTestClosed,
  endTestCode,
  endTestFailedAgain,
  goldTestClosed,
  goldTestFailed,
  goldTestPassed,
  mineBuilt,
  mineGoldEarned,
  mineInProgress,
  mineTestLeft,
  predictQuestion,
  testRunLast,
} = await import('@/lib/build/__fixtures__/test-pages');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PROJECT = { slug: 'mcp-server', name: 'Build an MCP server' };

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
/** What the routes answer: the test's reads in turn (then the last again), the project's side, a start, an answer. */
let tests: unknown[] = [];
let lastTest: unknown = null;
let mine: unknown = null;
let starts: unknown[] = [];
let answers: unknown[] = [];

const bodyOf = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : null);
const callsTo = (path: string) => fetchMock.mock.calls.filter(([url]) => String(url).startsWith(path));

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  tests = [];
  lastTest = null;
  mine = { mine: mineTestLeft };
  starts = [];
  answers = [];
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url);
    let body: unknown;
    let status = 200;
    if (path.startsWith('/api/me/build/test/start')) {
      body = starts.shift() ?? { ok: false, error: 'FAILED' };
    } else if (path.startsWith('/api/me/build/test/answer')) {
      body = answers.shift() ?? { ok: false, error: 'FAILED' };
    } else if (path.startsWith('/api/me/build/test')) {
      body = tests.length ? tests.shift() : lastTest;
    } else if (path.startsWith('/api/me/build/projects/')) {
      body = mine;
    } else {
      status = 404;
    }
    if (body && typeof body === 'object' && 'ok' in body && body.ok === false) status = 409;
    return new Response(JSON.stringify(body), { status });
  });
  hint.present = true;
  signIn.mockReset();
  signIn.mockResolvedValue(undefined);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

/** The test's reads, in turn: each `{ test }` body. */
const reads = (...bodies: unknown[]) => {
  for (const test of bodies) {
    tests.push({ test });
    lastTest = { test };
  }
};

const draw = (kind: 'end' | 'gold' = 'end', language: 'typescript' | 'python' | null = null) =>
  act(async () => {
    root.render(<BuildTestLive project={PROJECT} kind={kind} language={language} />);
  });
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const text = () => host.textContent ?? '';
const strip = () => $('[data-player-strip]')?.textContent ?? '';
const main = () => $('[data-answer-main]')!;
const option = (index: number) => $(`[data-option="${index}"] input`)! as HTMLInputElement;
const extra = () => $('[data-option="extra"] input')! as HTMLInputElement;
const buttonOf = (label: string) =>
  [...host.querySelectorAll<HTMLElement>('button, a')].find((element) => element.textContent?.trim() === label);
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });

describe('the test, for a visitor', () => {
  it('asks for nothing and signs in back to the test', async () => {
    hint.present = false;
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('[data-test-box="visitor"]')).not.toBeNull();
    expect(text()).toContain('The test needs an account');
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/build/mcp-server/test' });
  });
});

describe('a question', () => {
  it('opens a run in progress on its next question, with the rule, the strip and "I don’t know"', async () => {
    reads(endTestOpen);
    await draw();
    expect(strip()).toContain('Build');
    expect(strip()).toContain('Build an MCP server');
    expect(strip()).toContain('The test');
    expect(strip()).toContain('Question 4 of 10');
    expect(host.querySelectorAll('[data-square="answered"]')).toHaveLength(3);
    expect($('[data-test-rule]')?.textContent).toBe(
      '10 questions about what you built. 7 right makes the project Built.',
    );
    expect($('h2')?.textContent).toBe(testRun.questions[3].prompt);
    expect($('[data-option="extra"]')?.textContent).toContain('I don’t know');
    expect(main().getAttribute('aria-disabled')).toBe('true');
    expect($('[data-test-leave]')?.getAttribute('href')).toBe('/build/mcp-server');
    // Reading writes nothing.
    expect(callsTo('/api/me/build/test/start')).toHaveLength(0);
  });

  it('shows no right or wrong, lets the pick change, and sends the last one by its place in the run’s order', async () => {
    reads(endTestOpen);
    answers.push({ ok: true, data: { run: { ...testRun, answered: 4 }, result: null } });
    await draw();
    await click(option(0));
    expect(text()).toContain('Picked. You can change it until you go on. Right or wrong shows on the result.');
    await click(option(1));
    expect(option(1).checked).toBe(true);
    expect(option(0).checked).toBe(false);
    expect(host.querySelector('[data-option-mark="right"], [data-option-mark="wrong"]')).toBeNull();
    await click(main());
    const [, init] = callsTo('/api/me/build/test/answer')[0];
    expect(bodyOf(init)).toEqual({ run: testRun.run, question: testRun.questions[3].id, pick: 1 });
    // On to question 5, with no way back.
    expect(strip()).toContain('Question 5 of 10');
    expect($('h2')?.textContent).toBe(testRun.questions[4].prompt);
    expect(buttonOf('Back')).toBeUndefined();
  });

  it('sends "I don’t know" as no pick', async () => {
    reads(endTestOpen);
    answers.push({ ok: true, data: { run: { ...testRun, answered: 4 }, result: null } });
    await draw();
    await click(extra());
    await click(main());
    expect(bodyOf(callsTo('/api/me/build/test/answer')[0][1])).toMatchObject({ pick: null });
  });

  it('shows a question’s few lines of code, highlighted', async () => {
    reads(endTestCode);
    await draw();
    expect(strip()).toContain('Question 7 of 10');
    expect($('[data-question-code="output"]')?.textContent).toContain('Read this code');
    expect($('[data-question-code="output"]')?.textContent).toContain('return reply(msg.id, { tools: [] });');
    expect($('h2')?.textContent).toBe(predictQuestion.prompt);
  });

  it('finishes the test on the last question', async () => {
    reads({ ...endTestOpen, open: testRunLast });
    await draw();
    expect(main().textContent).toContain('Finish the test');
  });

  it('reads the test again when an answer was given already', async () => {
    reads(endTestOpen, { ...endTestOpen, open: { ...testRun, answered: 5 } });
    answers.push({ ok: false, error: 'CONFLICT' });
    await draw();
    await click(option(0));
    await click(main());
    expect(callsTo('/api/me/build/test?')).toHaveLength(2);
    expect(strip()).toContain('Question 6 of 10');
  });

  it('asks to sign in again when the session ended, never "try again"', async () => {
    reads(endTestOpen);
    answers.push({ ok: false, error: 'SIGNED_OUT' });
    await draw();
    await click(option(0));
    await click(main());
    expect($('[data-test-box="visitor"]')).not.toBeNull();
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/build/mcp-server/test' });
  });

  it('says in one line that a run ran out after a day, then shows the new one', async () => {
    reads(endTestOpen, { ...endTestOpen, open: { ...testRunFresh, run: 'r-new' } });
    answers.push({ ok: false, error: 'CONFLICT' });
    await draw();
    await click(option(0));
    await click(main());
    expect($('[data-test-notice]')?.textContent).toBe(
      'Your last test ran out after a day without its last answer, so its answers are gone.',
    );
    expect(strip()).toContain('Question 1 of 10');
  });

  it('keeps the keys out of an open run, whatever the route sends', async () => {
    const keyed = { ...testRun, questions: testQuestionsKeyed };
    reads({ ...endTestOpen, open: keyed });
    starts.push({ ok: true, data: keyed });
    const keyless = (questions: { content: unknown }[]) =>
      questions.every((question) =>
        (question.content as { options: object[] }).options.every((option) => Object.keys(option).join() === 'text'),
      );
    const read = await readBuildTest('mcp-server', 'end', null);
    expect(keyless(read?.open?.questions ?? [])).toBe(true);
    const started = await startBuildTestRun('mcp-server', 'end', null);
    expect(started.ok && keyless(started.data.questions)).toBe(true);
  });

  it('asks for the build the address names', async () => {
    reads(endTestOpen);
    await draw('end', 'python');
    expect(String(callsTo('/api/me/build/test?')[0][0])).toContain('language=python');
  });
});

describe('the start', () => {
  it('starts a run at once with no run and no result, and opens on question 1', async () => {
    reads(goldTestReady);
    starts.push({ ok: true, data: testRunFresh });
    await draw('gold');
    expect(bodyOf(callsTo('/api/me/build/test/start')[0][1])).toEqual({
      project: 'mcp-server',
      kind: 'gold',
      language: null,
    });
    expect(strip()).toContain('The gold test');
    expect(strip()).toContain('Question 1 of 10');
    expect($('[data-test-rule]')?.textContent).toBe('10 questions about what you built. 8 right earns the gold mark.');
  });

  it('asks to sign in again when the session ended before the start', async () => {
    reads(goldTestReady);
    starts.push({ ok: false, error: 'SIGNED_OUT' });
    await draw('gold');
    expect($('[data-test-box="visitor"]')?.textContent).toContain('The gold test needs an account');
  });

  it('says so when the run does not start, and tries again', async () => {
    reads(goldTestReady);
    await draw('gold');
    expect($('[data-test-box="start-failed"]')?.textContent).toContain('Your test did not start');
    starts.push({ ok: true, data: testRunFresh });
    await click(buttonOf('Try again')!);
    expect(strip()).toContain('Question 1 of 10');
  });
});

describe('the result', () => {
  it('shows in place after the tenth answer, with the build read again', async () => {
    reads({ ...endTestOpen, open: testRunLast });
    answers.push({ ok: true, data: { run: { ...testRunLast, answered: 10 }, result: passedResult } });
    await draw();
    mine = { mine: mineBuilt };
    await click(option(0));
    await click(main());
    expect($('[data-test-score]')?.textContent).toBe('9 of 10. It is Built.');
    expect(strip()).toContain('10 of 10 answered');
    expect(text()).toContain('The gold test opens on 3 Dec');
    expect(callsTo('/api/me/build/projects/')).toHaveLength(2);
  });

  it('after a failed tenth answer, offers the test again at once, with the test read again', async () => {
    reads({ ...endTestOpen, open: testRunLast }, endTestFailedAgain);
    answers.push({ ok: true, data: { run: { ...testRunLast, answered: 10 }, result: endTestFailedAgain.last } });
    await draw();
    await click(extra());
    await click(main());
    expect($('[data-test-score]')?.textContent).toBe('6 of 10. 7 are needed.');
    expect($('[data-test-again=""]')?.textContent).toBe('Take the test again');
    expect(callsTo('/api/me/build/test?')).toHaveLength(2);
  });

  it('shows again on a reload: the score, what comes now, then the answers', async () => {
    reads(endTestPassed);
    mine = { mine: mineBuilt };
    await draw();
    expect($('[data-test-score]')?.textContent).toBe('9 of 10. It is Built.');
    expect(text()).toContain('You needed 7.');
    expect(text()).not.toContain('Skills page');
    expect($('[data-test-pill="every-step"]')).not.toBeNull();
    expect(buttonOf('Open the project')?.getAttribute('href')).toBe('/build/mcp-server');
    expect([...host.querySelectorAll('button')].some((button) => button.textContent?.startsWith('Share'))).toBe(true);
    expect($('[data-test-wrong] h3')?.textContent).toBe('1 to look at again');
    expect(callsTo('/api/me/build/test/start')).toHaveLength(0);
  });

  it('puts the wrong answers first and open, each with its pick, the right answer, the reason and its step', async () => {
    reads(endTestFailedAgain);
    await draw();
    expect($('[data-test-score]')?.textContent).toBe('6 of 10. 7 are needed.');
    expect(text()).toContain('Look at the four below, then take it again');
    const rows = [...host.querySelectorAll<HTMLElement>('[data-test-wrong] [data-test-answer]')];
    expect(rows.map((row) => row.dataset.testAnswer)).toEqual(['2', '5', '8', '9']);
    expect(rows[0].textContent).toContain('You picked: Only the name of the tool');
    expect(rows[0].textContent).toContain('Right: The description in the list');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/build/mcp-server/list-the-tools');
    expect(rows[0].querySelector('a')?.textContent).toBe('Step 7: List the tools');
    expect(rows[2].textContent).toContain('You said: I don’t know');
    // The right ones are folded into one row that opens in place.
    const fold = buttonOf('6 you got rightShow them')!;
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect($('[data-test-right-list] ol')?.hidden).toBe(true);
    await click(fold);
    expect($('[data-test-right-list] ol')?.hidden).toBe(false);
    expect(text()).toContain('Hide them');
  });

  it('takes the test again: a new run, whose first question takes the result’s place', async () => {
    reads(endTestFailedAgain);
    starts.push({ ok: true, data: testRunFresh });
    await draw();
    await click(buttonOf('Take the test again')!);
    expect(bodyOf(callsTo('/api/me/build/test/start')[0][1])).toEqual({
      project: 'mcp-server',
      kind: 'end',
      language: null,
    });
    expect(strip()).toContain('Question 1 of 10');
  });

  it('says so in the box when the test does not start again', async () => {
    reads(endTestFailedAgain);
    await draw();
    await click(buttonOf('Take the test again')!);
    expect($('[data-test-start-failed]')?.textContent).toContain('It did not start.');
    expect($('[data-test-score]')).not.toBeNull();
  });

  it('leaves out the list of wrong answers when nothing is wrong', async () => {
    reads(endTestAllRight);
    await draw();
    expect($('[data-test-wrong]')).toBeNull();
    expect(text()).toContain('10 you got right');
  });

  it('for the gold test passed: the gold mark', async () => {
    reads(goldTestPassed);
    mine = { mine: mineGoldEarned };
    await draw('gold');
    expect($('[data-test-score]')?.textContent).toBe('8 of 10. You earned the gold mark.');
    expect($('[data-test-pill="repeated"]')?.textContent).toBe('Repeated after a week');
  });

  it('for the gold test not passed: the project stays Built, and the button says when the next try opens', async () => {
    reads(goldTestFailed);
    mine = { mine: mineBuilt };
    await draw('gold');
    expect($('[data-test-score]')?.textContent).toBe('7 of 10. 8 are needed for gold.');
    expect(text()).toContain('The project stays Built.');
    expect(text()).toContain('One try a day');
    expect(text()).toMatch(/The next gold test opens on \d+ Dec at \d\d:\d\d, with other questions\./);
    const later = $('[data-test-again="later"]')!;
    expect(later.textContent).toBe('Take the gold test again');
    expect(later.getAttribute('aria-disabled')).toBe('true');
    await click(later);
    expect(callsTo('/api/me/build/test/start')).toHaveLength(0);
  });
});

describe('a test that cannot start', () => {
  it('before the last step: where the build is, and the way back', async () => {
    reads(endTestClosed);
    mine = { mine: mineInProgress };
    await draw();
    expect($('[data-test-box="closed"]')?.textContent).toContain('The test comes after the last step');
    expect(text()).toContain('Your build is on step 9 of 16. Finish the base in your agent, and the test opens here.');
    expect(buttonOf('Back to the project')?.getAttribute('href')).toBe('/build/mcp-server');
    expect(callsTo('/api/me/build/test/start')).toHaveLength(0);
  });

  it('the gold test before its day: the day it opens, and no questions', async () => {
    reads(goldTestClosed);
    mine = { mine: mineBuilt };
    await draw('gold');
    expect(text()).toContain('The gold test opens on 3 Dec');
    expect($('[data-answer-part]')).toBeNull();
  });

  it('someone with no build of the project: told so plainly, with the way to the project', async () => {
    reads(null);
    mine = { mine: { builds: [], agentConnected: false, say: 'Build an MCP server with GitRanks' } };
    await draw();
    expect($('[data-test-box="no-build"]')?.textContent).toContain('You have no build of this project yet');
    expect(buttonOf('Back to the project')?.getAttribute('href')).toBe('/build/mcp-server');
    expect(buttonOf('Try again')).toBeUndefined();
  });

  it('a test that did not load: try again, or go back', async () => {
    reads(null, endTestPassed);
    await draw();
    expect($('[data-test-box="failed"]')?.textContent).toContain('Your test did not load');
    await click(buttonOf('Try again')!);
    expect($('[data-test-score]')).not.toBeNull();
  });
});
