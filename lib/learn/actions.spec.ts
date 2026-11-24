import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { readLearnIssues, readPracticeLessons, readPracticeNext, saveLearnProfile } = await import('./actions');
const { LearnIssuesDocument, LearnIssuesMaskedDocument, MyLearnAttemptsDocument } = await import(
  '@/lib/learn/learn.documents'
);
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');
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

describe("The Learn tab's reads from the browser", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('asks for up to 93 practice lessons', async () => {
    graphqlDirect.mockResolvedValue({ practiceLessons: { items: [], total: 0 }, learnIssues: { items: [] } });
    for (const first of [0, 94, 1.5, '3', null]) {
      expect(await readPracticeLessons(first as number), String(first)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(await readPracticeLessons(93)).toMatchObject({ ok: true });
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables)).toEqual([{ first: 93 }]);
  });

  it('asks for up to 100 issues for the goal', async () => {
    graphqlDirect.mockResolvedValue({ learnIssues: { items: [], total: 0 } });
    for (const first of [0, 101, 2.5, '20', null]) {
      expect(await readLearnIssues(first as number), String(first)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(await readLearnIssues(20)).toMatchObject({ ok: true });
    expect(await readLearnIssues(100)).toMatchObject({ ok: true });
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables)).toEqual([{ first: 20 }, { first: 100 }]);
  });

  it('reads the issues with their masked form, and as they were from an API without it', async () => {
    const masked = { items: [{ ...learnIssues().items[0], masked: maskedIssue() }], total: 1 };
    graphqlDirect.mockResolvedValue({ learnIssues: masked });
    expect(await readLearnIssues(10)).toEqual({ ok: true, data: masked });
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([LearnIssuesMaskedDocument]);

    // Today's answer of an API that does not know the field: the list as it was.
    graphqlDirect.mockReset();
    const today = learnIssues();
    graphqlDirect.mockImplementation(async (document) => {
      if (document === LearnIssuesMaskedDocument) {
        throw new Error('[{"message":"Cannot query field \\"masked\\" on type \\"LearnIssue\\"."}]');
      }
      return { learnIssues: today };
    });
    expect(await readLearnIssues(10)).toEqual({ ok: true, data: today });
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([
      LearnIssuesMaskedDocument,
      LearnIssuesDocument,
    ]);
  });

  it('answers an outage as a failure, asked once, never as an API without the field', async () => {
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await readLearnIssues(10)).toMatchObject({ ok: false, error: 'FAILED' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
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
    expect(
      graphqlDirect.mock.calls.some(([document]) =>
        [LearnIssuesDocument, LearnIssuesMaskedDocument].includes(document),
      ),
    ).toBe(false);

    graphqlDirect.mockReset();
    answer(myLearnAttempts.prOpen);
    expect(await readPracticeNext()).toEqual({ ok: true, data: { current: null, issues: learnIssues() } });
    expect(graphqlDirect).toHaveBeenLastCalledWith(LearnIssuesMaskedDocument, { first: 2 }, expect.anything());

    // The attempts unread: a lesson may be in progress, so no issue is read.
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await readPracticeNext()).toMatchObject({ ok: false });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(MyLearnAttemptsDocument, {}, expect.anything());
  });

  it('asks nothing signed out', async () => {
    auth.mockResolvedValue(null);
    expect(await readPracticeLessons(3)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
