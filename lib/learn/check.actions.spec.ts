import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { answerLearnCheckAction, saveLearnKnownAction, stopLearnCheckAction } = await import('./check.actions');
const { AnswerLearnCheckDocument, SaveLearnKnownDocument, StopLearnCheckDocument } = await import('./check.documents');
const { checkEnded } = await import('./__fixtures__/check');

const as = { source: 'client', githubLogin: 'octocat' };
const pick = { course: 'algorithms', group: 'big-o', picked: 1, dontKnow: false, language: 'python' };
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset().mockResolvedValue('octocat');
});

describe("a check's answer", () => {
  it('sends a pick or "I don\'t know" as the session\'s user, with no verdict back', async () => {
    graphqlDirect.mockResolvedValue({ answerLearnCheck: true });
    expect(await answerLearnCheckAction(pick)).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      AnswerLearnCheckDocument,
      { course: 'algorithms', group: 'big-o', picked: 1, language: 'python' },
      as,
    );
    await answerLearnCheckAction({ ...pick, picked: null, dontKnow: true, language: null });
    expect(graphqlDirect.mock.calls[1][1]).toEqual({
      course: 'algorithms',
      group: 'big-o',
      dontKnow: true,
      language: null,
    });
  });

  it('refuses a bad answer or a signed-out person without asking, and passes on a refusal', async () => {
    for (const bad of [null, { ...pick, group: '' }, { ...pick, dontKnow: true }, { ...pick, picked: {} }]) {
      expect(await answerLearnCheckAction(bad as never)).toEqual({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await answerLearnCheckAction(pick)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockRejectedValueOnce(apiError('CONFLICT'));
    expect(await answerLearnCheckAction(pick)).toEqual({ ok: false, error: 'CONFLICT' });
    graphqlDirect.mockResolvedValueOnce({ answerLearnCheck: null });
    expect(await answerLearnCheckAction(pick)).toEqual({ ok: true, data: null });
  });
});

describe('"Stop and see the result"', () => {
  it('ends the run as the person and answers its result', async () => {
    graphqlDirect.mockResolvedValueOnce({ stopLearnCheck: checkEnded() });
    expect(await stopLearnCheckAction('algorithms')).toEqual({ ok: true, data: checkEnded() });
    expect(graphqlDirect).toHaveBeenCalledWith(StopLearnCheckDocument, { course: 'algorithms' }, as);
  });

  it('refuses a course of another shape and a signed-out person, and passes on a refusal', async () => {
    expect(await stopLearnCheckAction('../x')).toEqual({ ok: false, error: 'INVALID' });
    expect(await stopLearnCheckAction(7 as never)).toEqual({ ok: false, error: 'INVALID' });
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await stopLearnCheckAction('algorithms')).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await stopLearnCheckAction('algorithms')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('saving the marks', () => {
  const marks = { course: 'algorithms', known: ['big-o-a', 'big-o-b'], check: 'run-1' };

  it('saves the lessons and the run as the person, and answers where they start', async () => {
    const saved = { start: { slug: 'stacks', title: 'Stacks' }, known: 2 };
    graphqlDirect.mockResolvedValueOnce({ saveLearnKnown: saved });
    expect(await saveLearnKnownAction(marks)).toEqual({ ok: true, data: saved });
    expect(graphqlDirect).toHaveBeenCalledWith(SaveLearnKnownDocument, marks, as);
  });

  it('sends "What you know" with no run', async () => {
    graphqlDirect.mockResolvedValueOnce({ saveLearnKnown: { start: null, known: 0 } });
    await saveLearnKnownAction({ ...marks, known: [], check: null });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ course: 'algorithms', known: [], check: null });
  });

  it('refuses bad marks or a signed-out person without asking, and passes on a refusal', async () => {
    for (const bad of [null, { ...marks, known: ['a', 'a'] }, { ...marks, known: 'a' }, { ...marks, check: ' ' }]) {
      expect(await saveLearnKnownAction(bad as never)).toEqual({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await saveLearnKnownAction(marks)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await saveLearnKnownAction(marks)).toEqual({ ok: false, error: 'FAILED' });
  });
});
