import { beforeEach, describe, expect, it, vi } from 'vitest';

const { highlightCodes } = vi.hoisted(() => ({ highlightCodes: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/highlight', () => ({ highlightCodes }));

const { shownRunOf, shownStartOf, shownTestOf } = await import('./test-code.data');
const { endTestOpen, endTestPassed, testRun } = await import('./__fixtures__/test');
const { predictQuestion } = await import('./__fixtures__/test-pages');
const { plainCodeOf } = await import('@/lib/workspace/code-tokens');

const COLOURED = [{ language: 'typescript', lines: [[{ text: 'if', light: '#d73a49' }]] }];
const withCode = {
  ...testRun,
  questions: testRun.questions.map((question, at) => (at === 6 ? predictQuestion : question)),
};

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
