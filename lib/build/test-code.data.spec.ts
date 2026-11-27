import { beforeEach, describe, expect, it, vi } from 'vitest';

const { highlightCodes } = vi.hoisted(() => ({ highlightCodes: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/highlight', () => ({ highlightCodes }));

const { shownAnswerOf, shownResultOf, shownRunOf, shownStartOf, shownTestOf } = await import('./test-code.data');
const { endTestOpen, endTestPassed, failedResult, testRun } = await import('./__fixtures__/test');
const { endTestFailedCode, predictQuestion } = await import('./__fixtures__/test-pages');
const { plainCodeOf } = await import('@/lib/workspace/code-tokens');

const COLOURED = [{ language: 'typescript', lines: [[{ text: 'if', light: '#d73a49' }]] }];
const withCode = {
  ...testRun,
  questions: testRun.questions.map((question, at) => (at === 6 ? predictQuestion : question)),
};
/** A failed result whose question 7 asks what code prints, as the API gives it: no colours yet. */
const { highlighted: _colours, ...resultWithCode } = endTestFailedCode.last as NonNullable<
  typeof endTestFailedCode.last
>;

beforeEach(() => {
  highlightCodes.mockReset();
  highlightCodes.mockResolvedValue(COLOURED);
});

describe("a test's code, highlighted before the browser gets it", () => {
  it('leaves a run with no code as the API gave it', async () => {
    expect(await shownRunOf(testRun)).toBe(testRun);
    expect(await shownTestOf(endTestPassed)).toBe(endTestPassed);
    expect(await shownTestOf(endTestOpen)).toEqual(endTestOpen);
    expect(highlightCodes).not.toHaveBeenCalled();
  });

  it('highlights each question that has code, by its id', async () => {
    const shown = await shownRunOf(withCode);
    expect(highlightCodes).toHaveBeenCalledWith(predictQuestion.codes);
    expect(shown.highlighted).toEqual({ [predictQuestion.id]: COLOURED });
    expect(shown.questions).toBe(withCode.questions);
  });

  it('sends the code plain when it cannot be highlighted', async () => {
    highlightCodes.mockRejectedValue(new Error('no highlighter'));
    const shown = await shownRunOf(withCode);
    expect(shown.highlighted?.[predictQuestion.id]).toEqual(predictQuestion.codes.map(plainCodeOf));
  });

  it('highlights a started run, and passes a refusal on as it is', async () => {
    const started = await shownStartOf({ ok: true, data: withCode });
    expect(started.ok && started.data?.highlighted).toBeTruthy();
    expect(await shownStartOf({ ok: false, error: 'CONFLICT' })).toEqual({ ok: false, error: 'CONFLICT' });
    expect(await shownStartOf({ ok: true, data: null })).toEqual({ ok: true, data: null });
  });
});

describe("a result's code, highlighted before the browser gets it", () => {
  it('highlights each answer whose question has code, and leaves a result with none as it is', async () => {
    const shown = await shownResultOf(resultWithCode);
    expect(highlightCodes).toHaveBeenCalledWith(predictQuestion.codes);
    expect(shown.highlighted).toEqual({ [predictQuestion.id]: COLOURED });
    expect(await shownResultOf(failedResult)).toBe(failedResult);
  });

  it("highlights a test's last result, and its open run, as the test is read", async () => {
    const shown = await shownTestOf({ ...endTestPassed, open: withCode, last: resultWithCode });
    expect(shown?.open?.highlighted).toEqual({ [predictQuestion.id]: COLOURED });
    expect(shown?.last?.highlighted).toEqual({ [predictQuestion.id]: COLOURED });
  });

  it('highlights the result that comes with the tenth answer, and passes the rest on as they are', async () => {
    const answered = await shownAnswerOf({ ok: true, data: { run: withCode, result: resultWithCode } });
    expect(answered.ok && answered.data?.result?.highlighted).toEqual({ [predictQuestion.id]: COLOURED });
    const midway = { ok: true as const, data: { run: withCode, result: null } };
    expect(await shownAnswerOf(midway)).toBe(midway);
    expect(await shownAnswerOf({ ok: false, error: 'CONFLICT' })).toEqual({ ok: false, error: 'CONFLICT' });
  });
});
