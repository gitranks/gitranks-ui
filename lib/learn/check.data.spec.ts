import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, highlightCodes } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  highlightCodes: vi.fn(async (codes: readonly { language: string; code: string }[]) =>
    codes.map((code) => ({ language: code.language, lines: [[{ text: 'lit' }]] })),
  ),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/highlight', () => ({ highlightCodes }));

const { loadLearnCheckSide } = await import('./check.data');
const { LearnCheckDocument } = await import('./check.documents');
const { checkEnded, checkRunOf } = await import('./__fixtures__/check');

/** The run as the API answers it: no highlighted code. */
const apiRun = () => {
  const run = checkRunOf(2);
  return { ...run, questions: run.questions.map(({ highlighted: _, ...asked }) => asked) };
};
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  highlightCodes.mockClear();
});

describe("the person's run of a check", () => {
  it('reads the run as the person, and highlights each question’s code', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCheck: apiRun() });
    const { check, missing } = await loadLearnCheckSide('octocat', 'algorithms');
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnCheckDocument,
      { course: 'algorithms' },
      { source: 'ssr', githubLogin: 'octocat' },
    );
    expect(missing).toBe(false);
    expect(check!.questions).toHaveLength(9);
    expect(check!.questions[0].highlighted[0].lines).toEqual([[{ text: 'lit' }]]);
    expect(check!.questions[1].answered).toBe(true);
  });

  it('draws plain code when highlighting fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCheck: apiRun() });
    highlightCodes.mockRejectedValue(new Error('no grammar'));
    const { check } = await loadLearnCheckSide('octocat', 'algorithms');
    expect(check!.questions[0].highlighted[0].lines.length).toBeGreaterThan(1);
    highlightCodes.mockReset().mockImplementation(async (codes) => codes.map((code) => ({ ...code, lines: [] })));
  });

  it('gives an ended run its result alone', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCheck: { ...checkEnded(), questions: apiRun().questions } });
    const { check } = await loadLearnCheckSide('octocat', 'algorithms');
    expect(check!.questions).toEqual([]);
    expect(check!.result).toHaveLength(9);
    expect(highlightCodes).not.toHaveBeenCalled();
  });

  it('is missing for a course with no check or of another shape, without asking for the latter', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await loadLearnCheckSide('octocat', 'algorithms')).toEqual({ check: null, missing: true });
    expect(await loadLearnCheckSide('octocat', '../x')).toEqual({ check: null, missing: true });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });

  it('is none when Learn is not open to the person, and on any other failure', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCheck: null });
    expect(await loadLearnCheckSide('octocat', 'algorithms')).toEqual({ check: null, missing: false });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnCheckSide('octocat', 'algorithms')).toEqual({ check: null, missing: false });
  });
});
