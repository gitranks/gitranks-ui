import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { readAttemptStage, readLearnIssueCount, readPracticeLessons, readPracticeNext, saveLearnProfile } = await import(
  './actions'
);
const { LearnIssuesDocument, MyLearnAttemptsDocument } = await import('@/lib/learn/learn.documents');
const { learnIssues, myLearnAttempts } = await import('@/lib/learn/__fixtures__/home');
const { SaveLearnProfileDocument } = await import('@/lib/learn/learn.documents');
const { filledProfile } = await import('@/lib/learn/__fixtures__/profile');

const input = {
  goalKind: 'PROJECT',
  goalValue: 'https://github.com/vercel/next.js',
  levels: [{ language: 'TypeScript', level: 2 }],
  focus: ['TESTS'],
};

describe('saving Goal and level', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it("saves the cleaned input as the session's user, and answers the saved profile", async () => {
    graphqlDirect.mockResolvedValue({ saveLearnProfile: filledProfile });
    const result = await saveLearnProfile(input);
    expect(result).toEqual({ ok: true, data: filledProfile });
    expect(graphqlDirect).toHaveBeenCalledWith(
      SaveLearnProfileDocument,
      {
        input: {
          goalKind: 'PROJECT',
          goalValue: 'vercel/next.js',
          levels: [{ language: 'TypeScript', level: 2 }],
          focus: ['TESTS'],
        },
      },
      expect.objectContaining({ githubLogin: 'octocat' }),
    );
  });

  it('refuses bad input without asking the API', async () => {
    for (const bad of [null, { ...input, goalKind: 'TOPIC' }, { ...input, levels: [{ language: 'Go', level: 9 }] }]) {
      expect(await saveLearnProfile(bad)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('asks a signed-out user to sign in, and passes on what the API refuses', async () => {
    auth.mockResolvedValue(null);
    expect(await saveLearnProfile(input)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    graphqlDirect.mockRejectedValue(new Error(JSON.stringify([{ message: 'no', extensions: { code: 'NOT_FOUND' } }])));
    expect(await saveLearnProfile(input)).toMatchObject({ ok: false, error: 'NOT_FOUND' });
  });
});

describe("Learn home's reads from the browser", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('asks for up to 30 practice lessons, and the count of issues alone', async () => {
    graphqlDirect.mockResolvedValue({ practiceLessons: { items: [], total: 0 }, learnIssues: { items: [] } });
    for (const first of [0, 31, 1.5, '3', null]) {
      expect(await readPracticeLessons(first as number), String(first)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(await readPracticeLessons(30)).toMatchObject({ ok: true });
    // The count reveals nothing: the browser can't ask for a row.
    expect(await (readLearnIssueCount as (first?: number) => Promise<unknown>)(10)).toMatchObject({ ok: true });
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables)).toEqual([{ first: 30 }, { first: 0 }]);
  });

  it("reads a passed practice lesson's two issues only with no lesson of the viewer's own in progress", async () => {
    const answer = (attempts: unknown) =>
      graphqlDirect.mockImplementation(async (document) =>
        document === MyLearnAttemptsDocument ? { myLearnAttempts: attempts } : { learnIssues: learnIssues() },
      );
    answer(myLearnAttempts.working);
    expect(await readPracticeNext()).toEqual({
      ok: true,
      data: { current: myLearnAttempts.working.current, issues: null },
    });
    expect(graphqlDirect.mock.calls.some(([document]) => document === LearnIssuesDocument)).toBe(false);

    graphqlDirect.mockReset();
    answer(myLearnAttempts.prOpen);
    expect(await readPracticeNext()).toEqual({ ok: true, data: { current: null, issues: learnIssues() } });
    expect(graphqlDirect).toHaveBeenLastCalledWith(LearnIssuesDocument, { first: 2 }, expect.anything());

    // The attempts unread: a lesson may be in progress, so no issue is read.
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await readPracticeNext()).toMatchObject({ ok: false });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(MyLearnAttemptsDocument, {}, expect.anything());
  });

  it("reads an attempt's stage by a short id only", async () => {
    graphqlDirect.mockResolvedValue({ learnAttemptLesson: { stage: 'WARMUP' } });
    for (const id of ['', ' ', 'x'.repeat(201), 12]) {
      expect(await readAttemptStage(id as string), String(id)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(await readAttemptStage('A_1')).toEqual({ ok: true, data: 'WARMUP' });
    graphqlDirect.mockResolvedValue({ learnAttemptLesson: null });
    expect(await readAttemptStage('A_1')).toEqual({ ok: true, data: null });
  });

  it('asks nothing signed out', async () => {
    auth.mockResolvedValue(null);
    expect(await readPracticeLessons(3)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
