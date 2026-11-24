import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const actions = await import('./pull-request.actions');
const documents = await import('./pull-request.documents');

const REF = { owner: 'acme', repo: 'widgets', issue: 42, attempt: 'A_1' };
const signedIn = (login = 'octocat') =>
  auth.mockResolvedValue({ user: { githubLogin: login, email: 'o@example.com' }, expires: '2099-01-01' });

beforeEach(() => {
  graphqlDirect.mockReset();
  graphqlDirect.mockResolvedValue({});
  auth.mockReset();
});

describe("the pull request page's calls", () => {
  it('each runs as the signed-in user, never one named in its arguments', async () => {
    signedIn();
    const calls: [keyof typeof actions, unknown[]][] = [
      [
        'sendPullRequestAction',
        [
          { ...REF, githubLogin: 'mallory' },
          { title: 'Fix', description: '' },
        ],
      ],
      ['sendRoundAction', [REF, 2]],
      ['setReplyAction', [REF, 2, 'R_1', { leftOut: true }]],
      ['markRoundNotNeededAction', [REF, 2, 'ASKS_NOTHING']],
      ['reopenRoundAction', [REF, 2]],
      ['markCommentAsksAction', [REF, 'C_1']],
      ['moreEndedAction', ['cursor-1']],
    ];
    expect(calls.map(([name]) => name).sort()).toEqual(Object.keys(actions).sort());
    for (const [name, args] of calls) {
      graphqlDirect.mockClear();
      await (actions[name] as (...rest: unknown[]) => Promise<unknown>)(...args);
      expect(graphqlDirect).toHaveBeenCalledTimes(1);
      expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ source: 'client', githubLogin: 'octocat' });
      expect(JSON.stringify(graphqlDirect.mock.calls[0][1])).not.toContain('mallory');
    }
  });

  it('asks nothing signed out', async () => {
    auth.mockResolvedValue(null);
    await expect(actions.sendRoundAction(REF, 1)).resolves.toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('refuses a fix, a round or a reason the page could not have sent, before asking the API', async () => {
    signedIn();
    const bad = [
      actions.sendRoundAction({ ...REF, owner: '../x' }, 1),
      actions.sendRoundAction({ ...REF, issue: 0 }, 1),
      actions.sendRoundAction({ ...REF, attempt: 'A 1' }, 1),
      actions.sendRoundAction(REF, 0),
      actions.sendRoundAction(REF, 1.5),
      actions.setReplyAction(REF, 1, 'R_1', { leftOut: 'yes' }),
      actions.setReplyAction(REF, 1, 'R_1', { leftOut: false, text: '   ' }),
      actions.markRoundNotNeededAction(REF, 1, 'BORED'),
      actions.markCommentAsksAction(REF, ''),
      actions.moreEndedAction(''),
    ];
    for (const result of await Promise.all(bad)) expect(result).toMatchObject({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('sends the pull request with its words as written, the sign-off only when ticked', async () => {
    signedIn();
    await expect(actions.sendPullRequestAction(REF, { title: '  ', description: '' })).resolves.toMatchObject({
      ok: false,
      message: 'Give the pull request a title.',
    });
    await actions.sendPullRequestAction(REF, { title: ' Skip empty names ', description: 'Fixes #42', signOff: 'on' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      documents.SendPullRequestDocument,
      { input: { ref: REF, title: 'Skip empty names', description: 'Fixes #42', signOff: false } },
      expect.anything(),
    );
  });

  it("answers the page after the call, and the API's refusal in its own words", async () => {
    signedIn();
    graphqlDirect.mockResolvedValueOnce({ reopenPullRequestRound: null });
    await expect(actions.reopenRoundAction(REF, 2)).resolves.toEqual({ ok: true, data: null });
    graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'Another round is open', extensions: { code: 'CONFLICT' } }])),
    );
    await expect(actions.reopenRoundAction(REF, 2)).resolves.toMatchObject({ ok: false, error: 'INVALID' });
  });
});
