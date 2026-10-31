import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const actions = await import('./actions');
const {
  AddToContributeSetDocument,
  ApproveAttemptDocument,
  ApproveFollowUpDocument,
  ApproveReplyDocument,
  ConnectClaudeKeyDocument,
  ConnectClaudeKeyWithLimitsDocument,
  ContributeAttemptLiveBareDocument,
  ContributeAttemptLiveDocument,
  ContributeIssueStatusDocument,
  ContributeIssuesDocument,
  ContributeOnboardingDocument,
  ContributeOwnAgentDocument,
  CreateMcpTokenDocument,
  DiscardAttemptDocument,
  RevokeMcpTokenDocument,
  SendBackToAgentDocument,
  SendContributeFeedbackDocument,
  StartFollowUpDocument,
  StartFollowUpOnDocument,
  VetoAutopilotDocument,
} = await import('@/lib/contribute/contribute.documents');

type Action = (...args: never[]) => Promise<{ ok: boolean; error?: string; message?: string }>;

/** Every server action, with arguments that name another user wherever an argument could. */
const CALLS: Record<string, unknown[]> = {
  connectClaudeKey: [{ key: 'sk-ant-x', plan: 'MAX_5X', renewalDay: 14, confirmedLimit: true, githubLogin: 'mallory' }],
  readFeedComputedAt: [],
  removeClaudeKey: [],
  saveContributeSettings: [{ cycleCapUsd: 10, githubLogin: 'mallory' }],
  savePreferences: [{ languages: ['GO'], githubLogin: 'mallory' }],
  noteProviderInterest: ['OPENAI'],
  withdrawProviderInterest: ['OPENAI'],
  deleteContributeData: [],
  revokeGithubGrant: [],
  pauseContributing: [],
  resumeContributing: [],
  skipIssue: ['I_1'],
  readIssueStatuses: [['I_1', 'I_2']],
  readIssuesPage: [{ after: 'c2', first: 2, filter: { languages: ['RUST'] }, githubLogin: 'mallory' }],
  approveAttempt: [{ id: 'A_1', title: 'Fix it', body: 'Fixes #1', dco: true, githubLogin: 'mallory' }],
  discardAttempt: ['A_1'],
  startFollowUp: ['PR_1'],
  approveFollowUp: ['A_F1', 'Follow-up', [{ draftId: 'D_1', text: 'Renamed it.', send: true }]],
  setResolveHumanThreads: [true],
  vetoAutopilot: ['A_1'],
  approveReply: ['D_1'],
  createMcpToken: ['laptop'],
  revokeMcpToken: ['T_1'],
  readAgentConnected: [{ tokenId: 'T_1', onboarded: true, githubLogin: 'mallory' }],
  sendBackToAgent: ['A_1', 'Add a test for tabs'],
  setContributeMode: ['STACK'],
  setContributeFallback: ['REPOS', 'SET_ONLY'],
  addToContributeSet: ['REPOS', 'vercel'],
  removeFromContributeSet: ['REPOS', ['R_1']],
  ignoreContributeRepo: ['R_1'],
  unignoreContributeRepo: ['R_1'],
  resolveContributeStack: [],
  readAttemptLive: ['A_1'],
  readContributeChanges: ['3.1', false],
  sendContributeFeedback: ['GATES', 'lodash is left out', { mode: 'STACK', githubLogin: 'mallory' }],
};

/** The actions about what the user works on: open only to the logins the modes are shown to. */
const SET_ACTIONS = [
  'setContributeMode',
  'setContributeFallback',
  'addToContributeSet',
  'removeFromContributeSet',
  'ignoreContributeRepo',
  'unignoreContributeRepo',
  'resolveContributeStack',
  'sendContributeFeedback',
];
const loginOf = (name: string) => (SET_ACTIONS.includes(name) ? 'maslianok' : 'octocat');

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

  it("reads a submitting attempt again with its steps' clock, and without it from an API that lacks it", async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    const live = { attemptId: 'A_1', state: 'SUBMITTING', updatedAt: 'x', submit: null, pullRequest: null };
    graphqlDirect.mockResolvedValueOnce({ contributeAttempt: live });
    const read = await actions.readAttemptLive('A_1');
    expect(read).toMatchObject({ ok: true, data: { attempt: live, clock: true } });
    expect(read.ok && Number.isNaN(Date.parse(read.data.readAt))).toBe(false);
    expect(graphqlDirect.mock.calls[0][0]).toBe(ContributeAttemptLiveDocument);

    graphqlDirect.mockReset();
    graphqlDirect
      .mockRejectedValueOnce(new Error(JSON.stringify([{ message: 'Cannot query field "steps" on type "X".' }])))
      .mockResolvedValueOnce({ contributeAttempt: live });
    await expect(actions.readAttemptLive('A_1')).resolves.toMatchObject({
      ok: true,
      data: { attempt: live, clock: false },
    });
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([
      ContributeAttemptLiveDocument,
      ContributeAttemptLiveBareDocument,
    ]);
    // Told so, the stepper asks without the clock: one read, not two.
    graphqlDirect.mockReset();
    graphqlDirect.mockResolvedValueOnce({ contributeAttempt: live });
    await expect(actions.readAttemptLive('A_1', false)).resolves.toMatchObject({ ok: true, data: { clock: false } });
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([ContributeAttemptLiveBareDocument]);

    // Not the viewer's: no second read.
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValueOnce(new Error(JSON.stringify([{ extensions: { code: 'NOT_FOUND' } }])));
    await expect(actions.readAttemptLive('A_1')).resolves.toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });

  it.each(Object.keys(CALLS))('%s runs as the signed-in user, never one named in its arguments', async (name) => {
    auth.mockResolvedValue({ user: { githubLogin: loginOf(name) }, expires: '2099-01-01' });
    const action = (actions as unknown as Record<string, Action>)[name];

    await action(...(CALLS[name] as never[]));

    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'client', githubLogin: loginOf(name) });
  });

  it.each(SET_ACTIONS)('%s refuses, and calls nothing, for a login the modes are not shown to', async (name) => {
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    const action = (actions as unknown as Record<string, Action>)[name];

    expect(await action(...(CALLS[name] as never[]))).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(graphqlDirect).not.toHaveBeenCalled();
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

describe('connectClaudeKey', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    graphqlDirect.mockResolvedValue({
      connectClaudeKey: { result: 'CONNECTED', retryAfterSec: null, credential: null },
    });
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const input = { key: ' sk-ant-x ', plan: 'MAX_5X' as const, renewalDay: 14.6, confirmedLimit: true };

  it('connects from a plan without asking for limits, so an API without them still takes it', async () => {
    await actions.connectClaudeKey(input);

    expect(graphqlDirect).toHaveBeenCalledWith(
      ConnectClaudeKeyDocument,
      { key: 'sk-ant-x', plan: 'MAX_5X', renewalDay: 14, confirmedLimit: true },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('sends the limits the user set, a week or day cap left empty as none, and nothing else', async () => {
    await actions.connectClaudeKey({
      ...input,
      plan: 'CREDITS',
      cycleCapUsd: 50,
      limits: { weekCapUsd: null, dayCapUsd: 10, attemptCapUsd: 5, pace: 'FAST', extra: 1 } as never,
    });

    expect(graphqlDirect).toHaveBeenCalledWith(
      ConnectClaudeKeyWithLimitsDocument,
      {
        key: 'sk-ant-x',
        plan: 'CREDITS',
        renewalDay: 14,
        confirmedLimit: true,
        cycleCapUsd: 50,
        limits: { weekCapUsd: null, dayCapUsd: 10, attemptCapUsd: 5, pace: 'FAST' },
      },
      { source: 'client', githubLogin: 'octocat' },
    );
  });
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

describe('the follow-up actions', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it.each([
    ['startFollowUp', StartFollowUpDocument, 'PR_1', { prId: 'PR_1' }, 'startFollowUp'],
    ['vetoAutopilot', VetoAutopilotDocument, 'A_1', { attemptId: 'A_1' }, 'vetoAutopilot'],
    ['approveReply', ApproveReplyDocument, 'D_1', { draftId: 'D_1' }, 'approveReply'],
  ] as const)(
    '%s sends its one id, as the signed-in user, and answers what the API did',
    async (name, document, id, variables, field) => {
      graphqlDirect.mockResolvedValue({ [field]: { ok: id } });
      const action = (actions as unknown as Record<string, (value: string) => Promise<unknown>>)[name];

      expect(await action(id)).toEqual({ ok: true, data: { ok: id } });
      expect(graphqlDirect).toHaveBeenCalledWith(document, variables, { source: 'client', githubLogin: 'octocat' });
    },
  );

  it('passes on a refusal in its own words, for the page to put plainly', async () => {
    graphqlDirect.mockRejectedValue(
      new Error(
        JSON.stringify([
          { message: 'A follow-up is already under way on this pull request', extensions: { code: 'CONFLICT' } },
        ]),
      ),
    );

    expect(await actions.startFollowUp('PR_1')).toEqual({
      ok: false,
      error: 'INVALID',
      message: 'A follow-up is already under way on this pull request',
    });
  });

  it("approves a follow-up with the title the API needs, an empty body and no sign-off of the user's own", async () => {
    graphqlDirect.mockResolvedValue({ approveAttempt: { attemptId: 'A_F1', state: 'SUBMITTING' } });

    await actions.approveAttempt({ id: 'A_F1', title: 'Follow-up on pull request #1419', body: '', dco: false });

    expect(graphqlDirect).toHaveBeenCalledWith(
      ApproveAttemptDocument,
      { id: 'A_F1', title: 'Follow-up on pull request #1419', body: '', dco: false },
      { source: 'client', githubLogin: 'octocat' },
    );
  });
});

describe('the follow-up flow’s actions', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });
  const as = { source: 'client', githubLogin: 'octocat' };

  it('starts a follow-up on the comments chosen, and refuses none chosen before asking', async () => {
    graphqlDirect.mockResolvedValue({ startFollowUp: { attemptId: 'A_F2' } });
    await actions.startFollowUp('PR_1', ['C_1', 'C_2']);
    expect(graphqlDirect).toHaveBeenCalledWith(
      StartFollowUpOnDocument,
      { prId: 'PR_1', commentIds: ['C_1', 'C_2'] },
      as,
    );

    graphqlDirect.mockReset();
    expect(await actions.startFollowUp('PR_1', [])).toMatchObject({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('approves a follow-up with its replies trimmed, and refuses a reply to post with no text', async () => {
    graphqlDirect.mockResolvedValue({ approveAttempt: { attemptId: 'A_F1', state: 'SUBMITTING' } });
    await actions.approveFollowUp('A_F1', 'Follow-up on pull request #1419', [
      { draftId: 'D_1', text: '  Renamed it.  ', send: true },
      { draftId: 'D_2', text: '', send: false },
    ]);
    expect(graphqlDirect).toHaveBeenCalledWith(
      ApproveFollowUpDocument,
      {
        id: 'A_F1',
        title: 'Follow-up on pull request #1419',
        replies: [
          { draftId: 'D_1', text: 'Renamed it.', send: true },
          { draftId: 'D_2', text: '', send: false },
        ],
      },
      as,
    );

    graphqlDirect.mockReset();
    const empty = await actions.approveFollowUp('A_F1', 't', [{ draftId: 'D_1', text: ' ', send: true }]);
    expect(empty).toMatchObject({ ok: false, error: 'INVALID', message: expect.stringContaining('no text') });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("the own agent's actions", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });
  const as = { source: 'client', githubLogin: 'octocat' };

  it('creates a token under its trimmed name, and answers the token the API gave once', async () => {
    const created = {
      token: 'gr_x',
      mcpToken: { id: 'T_1', name: 'laptop', last4: 'x', createdAt: '', lastUsedAt: null },
    };
    graphqlDirect.mockResolvedValue({ createMcpToken: created });

    expect(await actions.createMcpToken('  laptop ')).toEqual({ ok: true, data: created });
    expect(graphqlDirect).toHaveBeenCalledWith(CreateMcpTokenDocument, { name: 'laptop' }, as);
  });

  it('refuses a blank or too long name before asking anything', async () => {
    expect(await actions.createMcpToken('  ')).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await actions.createMcpToken('x'.repeat(41))).toMatchObject({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('revokes a token by its id', async () => {
    graphqlDirect.mockResolvedValue({ revokeMcpToken: true });
    expect(await actions.revokeMcpToken('T_1')).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenCalledWith(RevokeMcpTokenDocument, { id: 'T_1' }, as);
  });

  it('sends a change back to the agent with the trimmed note, and refuses an empty one', async () => {
    graphqlDirect.mockResolvedValue({ sendBackToAgent: { attemptId: 'A_1', state: 'RUNNING' } });
    expect(await actions.sendBackToAgent('A_1', ' Add a test ')).toEqual({
      ok: true,
      data: { attemptId: 'A_1', state: 'RUNNING' },
    });
    expect(graphqlDirect).toHaveBeenCalledWith(SendBackToAgentDocument, { attemptId: 'A_1', note: 'Add a test' }, as);
    expect(await actions.sendBackToAgent('A_1', ' ')).toMatchObject({ ok: false, error: 'INVALID' });
  });
});

describe('readAgentConnected', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });
  const as = { source: 'client', githubLogin: 'octocat' };
  const tokens = (lastUsedAt: string | null) => ({
    contribute: {
      contributor: { paths: { hosted: false, mcp: true } },
      mcpTokens: [{ id: 'T_1', name: 'Claude Code on macOS', last4: 'Qx9z', createdAt: '', lastUsedAt }],
    },
  });

  it('reads the onboarded stamp alone for a user not onboarded yet', async () => {
    graphqlDirect.mockResolvedValueOnce({ contribute: { contributor: { onboardedAt: '2026-10-28T12:00:00Z' } } });

    expect(await actions.readAgentConnected({ tokenId: 'T_1', onboarded: false })).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeOnboardingDocument, undefined, as);
  });

  it('answers not yet while the stamp is unset, without reading the tokens', async () => {
    graphqlDirect.mockResolvedValueOnce({ contribute: { contributor: { onboardedAt: null } } });

    expect(await actions.readAgentConnected({ tokenId: 'T_1', onboarded: false })).toEqual({ ok: true, data: false });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });

  it("falls back on the token's first use when the API does not answer the stamp", async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"onboardedAt\\""}]'));
    graphqlDirect.mockResolvedValueOnce(tokens('2026-10-28T12:00:00Z'));

    expect(await actions.readAgentConnected({ tokenId: 'T_1', onboarded: false })).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenLastCalledWith(ContributeOwnAgentDocument, undefined, as);
  });

  it('waits for the new token to be used by a user onboarded already', async () => {
    graphqlDirect.mockResolvedValueOnce(tokens(null));
    expect(await actions.readAgentConnected({ tokenId: 'T_1', onboarded: true })).toEqual({ ok: true, data: false });
    graphqlDirect.mockResolvedValueOnce(tokens('2026-10-28T12:00:00Z'));
    expect(await actions.readAgentConnected({ tokenId: 'T_1', onboarded: true })).toEqual({ ok: true, data: true });
    expect(graphqlDirect).not.toHaveBeenCalledWith(ContributeOnboardingDocument, undefined, as);
  });

  it('asks nothing of the tokens without one to watch', async () => {
    expect(await actions.readAgentConnected({ tokenId: null, onboarded: true })).toEqual({ ok: true, data: false });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('the actions about what the user works on', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'maslianok' }, expires: '2099-01-01' });
  });

  it('refuse a mode, list or fallback that is not one, and an empty or long add, before calling', async () => {
    expect(await actions.setContributeMode('NONE' as never)).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await actions.setContributeFallback('ALL' as never, 'SET_ONLY')).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(await actions.addToContributeSet('TARGETS' as never, 'vercel')).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(await actions.addToContributeSet('REPOS', '   ')).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await actions.addToContributeSet('REPOS', 'x'.repeat(201))).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await actions.removeFromContributeSet('REPOS', [])).toMatchObject({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('send an add trimmed', async () => {
    graphqlDirect.mockResolvedValue({ addToContributeSet: { added: [] } });
    await actions.addToContributeSet('SOURCES', '  @me ');

    expect(graphqlDirect).toHaveBeenCalledWith(
      AddToContributeSetDocument,
      { list: 'SOURCES', input: '@me' },
      { source: 'client', githubLogin: 'maslianok' },
    );
  });

  it('read a day limit as RATE_LIMITED, and a full ignore list as LIST_FULL', async () => {
    graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'x', extensions: { code: 'RATE_LIMITED' } }])),
    );
    expect(await actions.resolveContributeStack()).toEqual({ ok: false, error: 'RATE_LIMITED' });
    graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'x', extensions: { code: 'LIST_FULL' } }])),
    );
    expect(await actions.ignoreContributeRepo('R_1')).toEqual({ ok: false, error: 'LIST_FULL' });
  });

  it('send feedback trimmed, within its limit, with only the known parts of its context', async () => {
    expect(await actions.sendContributeFeedback('GATES', '  ')).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await actions.sendContributeFeedback('GATES', 'x'.repeat(2001))).toMatchObject({
      ok: false,
      error: 'INVALID',
      message: 'Keep it to 2,000 characters at most.',
    });
    expect(await actions.sendContributeFeedback('PRAISE' as never, 'hi')).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();

    graphqlDirect.mockResolvedValue({ sendContributeFeedback: true });
    expect(
      await actions.sendContributeFeedback('GATES', ' lodash is left out ', {
        mode: 'STACK',
        repo: ' lodash/lodash ',
        reasons: ['OUTSIDE_MERGES', 'NOT_A_REASON' as never],
        githubLogin: 'mallory',
      } as never),
    ).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenCalledWith(
      SendContributeFeedbackDocument,
      {
        topic: 'GATES',
        text: 'lodash is left out',
        context: { mode: 'STACK', repo: 'lodash/lodash', reasons: ['OUTSIDE_MERGES'] },
      },
      { source: 'client', githubLogin: 'maslianok' },
    );

    graphqlDirect.mockClear();
    await actions.sendContributeFeedback('OTHER', 'hello', { mode: 'NOPE' as never });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ topic: 'OTHER', text: 'hello' });
  });
});

describe('readIssueStatuses and readIssuesPage', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('asks about at most 50 ids, in order, and nothing for none', async () => {
    graphqlDirect.mockResolvedValue({ contributeIssueStatus: [] });
    const ids = Array.from({ length: 60 }, (_, at) => `I_${at}`);

    await actions.readIssueStatuses(['', ...ids] as string[]);
    expect(graphqlDirect).toHaveBeenCalledWith(
      ContributeIssueStatusDocument,
      { issueIds: ids.slice(0, 50) },
      { source: 'client', githubLogin: 'octocat' },
    );

    graphqlDirect.mockClear();
    expect(await actions.readIssueStatuses([])).toEqual({ ok: true, data: [] });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers null when the API hides the statuses', async () => {
    graphqlDirect.mockResolvedValue({ contributeIssueStatus: null });

    expect(await actions.readIssueStatuses(['I_1'])).toEqual({ ok: true, data: null });
  });

  it('reads the next issues after the cursor, a page at most, under the known filters alone', async () => {
    graphqlDirect.mockResolvedValue({ contributeIssues: { items: [], next: null, total: 0, computedAt: null } });

    await actions.readIssuesPage({
      after: 'c2',
      first: 99,
      filter: { languages: ['RUST', 'COBOL' as never], kinds: 'BUG' as never, maxSize: 'M' },
    });
    expect(graphqlDirect).toHaveBeenCalledWith(
      ContributeIssuesDocument,
      { first: 20, after: 'c2', filter: { languages: ['RUST'], maxSize: 'M' } },
      { source: 'client', githubLogin: 'octocat' },
    );

    graphqlDirect.mockClear();
    await actions.readIssuesPage({ after: 'c3', first: 0 });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ first: 1, after: 'c3' });

    graphqlDirect.mockClear();
    expect(await actions.readIssuesPage({ after: '', first: 2 })).toMatchObject({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('readContributeChanges', () => {
  const CHANGES = { version: '4.2', activity: false, changed: [] };
  const ACTIVITY = { items: [], readAt: '2026-10-31T21:00:00.000Z' };
  const as = (githubLogin: string) => auth.mockResolvedValue({ user: { githubLogin }, expires: '2099-01-01' });

  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    as('maslianok');
  });

  it('reads what moved since the version held, and nothing more when nothing runs', async () => {
    graphqlDirect.mockResolvedValueOnce({ contributeChanges: CHANGES });

    expect(await actions.readContributeChanges('3.2', false)).toEqual({ ok: true, data: { changes: CHANGES } });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ since: '3.2' });
  });

  it('sends no version it could not have had from a read', async () => {
    graphqlDirect.mockResolvedValue({ contributeChanges: CHANGES });

    await actions.readContributeChanges('3', false);
    await actions.readContributeChanges({ since: '1.1' } as never, false);
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables)).toEqual([{ since: null }, { since: null }]);
  });

  it.each([
    ['asked', { ...CHANGES }, true],
    ['running', { ...CHANGES, activity: true }, false],
    ['the list moved', { ...CHANGES, changed: ['SET'] }, false],
    ['work started or ended', { ...CHANGES, changed: ['ACTIVITY'] }, false],
  ])('reads the work in progress in the same call when %s', async (_why, changes, withActivity) => {
    graphqlDirect.mockResolvedValueOnce({ contributeChanges: changes }).mockResolvedValueOnce({
      contributeActivity: ACTIVITY,
    });

    expect(await actions.readContributeChanges('3.2', withActivity as boolean)).toEqual({
      ok: true,
      data: { changes, activity: ACTIVITY },
    });
  });

  it('never reads or runs the work in progress for a login the modes are not shown to; leaves it out when it fails', async () => {
    as('octocat');
    graphqlDirect.mockResolvedValueOnce({ contributeChanges: { ...CHANGES, activity: true, changed: ['SET'] } });
    // Nothing would ever settle the flag for them: it never holds their poll fast.
    expect(await actions.readContributeChanges('3.2', true)).toEqual({
      ok: true,
      data: { changes: { ...CHANGES, activity: false, changed: ['SET'] } },
    });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);

    as('maslianok');
    graphqlDirect.mockResolvedValueOnce({ contributeChanges: CHANGES }).mockRejectedValueOnce(new Error('down'));
    expect(await actions.readContributeChanges('3.2', true)).toEqual({ ok: true, data: { changes: CHANGES } });
  });

  it('answers null when the API hides Contribute, and an error when it fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ contributeChanges: null });
    expect(await actions.readContributeChanges(null, true)).toEqual({ ok: true, data: null });

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await actions.readContributeChanges(null, false)).toMatchObject({ ok: false });
  });
});
