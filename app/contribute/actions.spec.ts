import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const actions = await import('./actions');
const { ApproveAttemptDocument, DiscardAttemptDocument } = await import('@/lib/contribute/contribute.documents');

type Action = (...args: never[]) => Promise<{ ok: boolean; error?: string; message?: string }>;

/** Every server action, with arguments that name another user wherever an argument could. */
const CALLS: Record<string, unknown[]> = {
  connectClaudeKey: [{ key: 'sk-ant-x', plan: 'MAX_5X', renewalDay: 14, confirmedLimit: true, githubLogin: 'mallory' }],
  removeClaudeKey: [],
  saveContributeSettings: [{ cycleCapUsd: 10, githubLogin: 'mallory' }],
  savePreferences: [{ languages: ['GO'], githubLogin: 'mallory' }],
  noteProviderInterest: ['OPENAI'],
  deleteContributeData: [],
  revokeGithubGrant: [],
  pauseContributing: [],
  resumeContributing: [],
  skipIssue: ['I_1'],
  approveAttempt: [{ id: 'A_1', title: 'Fix it', body: 'Fixes #1', dco: true, githubLogin: 'mallory' }],
  discardAttempt: ['A_1'],
};

const exported = Object.entries(actions).filter(([, value]) => typeof value === 'function') as [string, Action][];

describe('the Contribute server actions', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    graphqlDirect.mockResolvedValue({});
    auth.mockReset();
  });

  it('are all covered here', () => {
    expect(exported.map(([name]) => name).sort()).toEqual(Object.keys(CALLS).sort());
  });

  it.each(Object.keys(CALLS))('%s runs as the signed-in user, never one named in its arguments', async (name) => {
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    const action = (actions as unknown as Record<string, Action>)[name];

    await action(...(CALLS[name] as never[]));

    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'client', githubLogin: 'octocat' });
  });

  it.each(Object.keys(CALLS))(
    '%s calls nothing without a session, or with one that needs a new sign-in',
    async (name) => {
      const action = (actions as unknown as Record<string, Action>)[name];

      auth.mockResolvedValueOnce(null);
      expect(await action(...(CALLS[name] as never[]))).toEqual({ ok: false, error: 'SIGNED_OUT' });
      auth.mockResolvedValueOnce({
        user: { githubLogin: 'octocat' },
        error: 'RefreshTokenError',
        expires: '2099-01-01',
      });
      expect(await action(...(CALLS[name] as never[]))).toEqual({ ok: false, error: 'SIGNED_OUT' });

      expect(graphqlDirect).not.toHaveBeenCalled();
    },
  );
});

describe('approveAttempt and discardAttempt', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('sends the trimmed title and body, and the sign-off only when it is ticked', async () => {
    graphqlDirect.mockResolvedValue({ approveAttempt: { attemptId: 'A_1', state: 'SUBMITTING' } });

    const result = await actions.approveAttempt({
      id: 'A_1',
      title: '  Fix it ',
      body: ' Body\n',
      dco: 'yes' as never,
    });

    expect(result).toEqual({ ok: true, data: { attemptId: 'A_1', state: 'SUBMITTING' } });
    expect(graphqlDirect).toHaveBeenCalledWith(
      ApproveAttemptDocument,
      { id: 'A_1', title: 'Fix it', body: 'Body', dco: false },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('refuses an empty or too long title, and a too long body, without calling the API', async () => {
    expect(await actions.approveAttempt({ id: 'A_1', title: ' ', body: '', dco: false })).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(await actions.approveAttempt({ id: 'A_1', title: 'x'.repeat(257), body: '', dco: false })).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(
      await actions.approveAttempt({ id: 'A_1', title: 'Fix', body: 'x'.repeat(60_001), dco: false }),
    ).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("passes on the API's refusal of an attempt that is not in review any more", async () => {
    graphqlDirect.mockRejectedValue(
      new Error(JSON.stringify([{ message: 'The attempt is not in review', extensions: { code: 'CONFLICT' } }])),
    );

    expect(await actions.discardAttempt('A_1')).toEqual({
      ok: false,
      error: 'INVALID',
      message: 'The attempt is not in review',
    });
    expect(graphqlDirect).toHaveBeenCalledWith(
      DiscardAttemptDocument,
      { id: 'A_1' },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('says an attempt that is not the user’s was not found', async () => {
    graphqlDirect.mockRejectedValue(
      new Error(JSON.stringify([{ message: 'nope', extensions: { code: 'NOT_FOUND' } }])),
    );

    expect(await actions.discardAttempt('A_2')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
