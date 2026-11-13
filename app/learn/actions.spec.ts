import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { saveLearnProfile } = await import('./actions');
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
