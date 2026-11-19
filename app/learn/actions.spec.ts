import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { readLearnIssues, readPracticeLessons, saveLearnProfile } = await import('./actions');
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

  it('asks for up to 30 practice lessons and up to 2 issues, nothing else', async () => {
    graphqlDirect.mockResolvedValue({ practiceLessons: { items: [], total: 0 }, learnIssues: { items: [] } });
    for (const first of [0, 31, 1.5, '3', null]) {
      expect(await readPracticeLessons(first as number), String(first)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    for (const first of [-1, 3, 10, 0.5, '0']) {
      expect(await readLearnIssues(first as number), String(first)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(await readPracticeLessons(30)).toMatchObject({ ok: true });
    expect(await readLearnIssues(0)).toMatchObject({ ok: true });
    expect(await readLearnIssues(2)).toMatchObject({ ok: true });
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables)).toEqual([
      { first: 30 },
      { first: 0 },
      { first: 2 },
    ]);
  });

  it('asks nothing signed out', async () => {
    auth.mockResolvedValue(null);
    expect(await readPracticeLessons(3)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
