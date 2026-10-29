import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const {
  ContributeUnavailableError,
  loadAttempt,
  loadAttempts,
  loadContribute,
  loadContributions,
  loadOpenPrDrafts,
  loadReplyDrafts,
} = await import('./contribute.data');
const {
  ContributeAttemptDocument,
  ContributeAttemptFollowUpsDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAutopilotDocument,
  ContributeContributionsDocument,
  ContributeContributionsFollowUpsDocument,
  ContributeGrantDocument,
  ContributeOverviewDocument,
  ContributeReplyDraftsDocument,
} = await import('./contribute.documents');

/** Answers the overview with `overview`, the grant and the pause with nothing. */
const answer = (overview: () => Promise<unknown>) =>
  graphqlDirect.mockImplementation((document) =>
    document === ContributeOverviewDocument
      ? overview()
      : Promise.reject(new Error('[{"message":"Cannot query field"}]')),
  );

describe('loadContribute', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('is null, a 404, for a visitor without a session and for one Contribute is hidden from', async () => {
    auth.mockResolvedValueOnce(null);
    expect(await loadContribute()).toBeNull();

    answer(async () => ({ contribute: null }));
    expect(await loadContribute()).toBeNull();
    answer(async () => ({ contribute: { previewAllowed: false, contributor: null } }));
    expect(await loadContribute()).toBeNull();
  });

  it('throws on an outage, so the page says to try again rather than not found', async () => {
    answer(() => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')));

    await expect(loadContribute()).rejects.toBeInstanceOf(ContributeUnavailableError);
  });

  it('leaves the fields the API does not answer yet undefined', async () => {
    answer(async () => ({ contribute: { previewAllowed: true, contributor: null } }));

    expect(await loadContribute()).toMatchObject({ contributor: null, grant: undefined, paused: undefined });
    expect(graphqlDirect.mock.calls.some(([document]) => document === ContributeGrantDocument)).toBe(true);
  });
});

const graphqlError = (code: string, message = 'refused') =>
  new Error(JSON.stringify([{ message, extensions: { code } }]));

describe('loadAttempt', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('reads the attempt as the signed-in user', async () => {
    graphqlDirect.mockResolvedValue({ contributeAttempt: { attemptId: 'A_1' } });

    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1' });
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([{ id: 'A_1' }, { source: 'ssr', githubLogin: 'octocat' }]);
  });

  it("is null, a 404, signed out, hidden, or for an attempt that is not the user's", async () => {
    auth.mockResolvedValueOnce(null);
    expect(await loadAttempt('A_1')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();

    graphqlDirect.mockResolvedValueOnce({ contributeAttempt: null });
    expect(await loadAttempt('A_1')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(graphqlError('NOT_FOUND'));
    expect(await loadAttempt('A_2')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(graphqlError('BAD_USER_INPUT'));
    expect(await loadAttempt('not-an-id')).toBeNull();
  });

  it('is undefined while the API does not answer the review, and throws on an outage', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"contributeAttempt\\""}]'));
    expect(await loadAttempt('A_1')).toBeUndefined();

    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));
    await expect(loadAttempt('A_1')).rejects.toBeInstanceOf(ContributeUnavailableError);
  });
});

describe('loadAttempts and loadContributions', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('ask for one state when given, as the signed-in user', async () => {
    graphqlDirect.mockResolvedValue({ contributeAttempts: [] });

    expect(await loadAttempts('REVIEW', 5)).toEqual([]);
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([
      { first: 5, state: 'REVIEW' },
      { source: 'ssr', githubLogin: 'octocat' },
    ]);
  });

  it('are undefined, "not available yet", on any failure or when hidden', async () => {
    graphqlDirect.mockRejectedValue(graphqlError('GRAPHQL_VALIDATION_FAILED'));
    expect(await loadAttempts()).toBeUndefined();
    expect(await loadContributions()).toBeUndefined();

    graphqlDirect.mockResolvedValue({ contributeAttempts: null, contributeContributions: null });
    expect(await loadAttempts()).toBeUndefined();
    expect(await loadContributions()).toBeUndefined();
  });
});

describe('the follow-up fields, read on their own', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const NOT_YET = () => Promise.reject(new Error('[{"message":"Cannot query field \\"needsYou\\""}]'));
  const signals = { since: 'x', signals: [{ kind: 'COMMENT', at: 'x', detail: null }] };
  const rounds = { used: 1, left: 1, max: 2, handedOff: false, handedOffAt: null, currentAttemptId: null };

  it('merge into the attempts by id, and leave them out when the API does not answer them', async () => {
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptsDocument
        ? Promise.resolve({ contributeAttempts: [{ attemptId: 'A_1' }, { attemptId: 'A_2' }] })
        : Promise.resolve({
            contributeAttempts: [{ attemptId: 'A_2', needsYou: signals, followUps: rounds, autosubmitAt: null }],
          }),
    );
    expect(await loadAttempts()).toEqual([
      { attemptId: 'A_1' },
      { attemptId: 'A_2', needsYou: signals, followUps: rounds, autosubmitAt: null },
    ]);
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toContain(ContributeAttemptsFollowUpsDocument);

    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptsDocument
        ? Promise.resolve({ contributeAttempts: [{ attemptId: 'A_1' }] })
        : NOT_YET(),
    );
    const [only] = (await loadAttempts()) ?? [];
    expect(only).toEqual({ attemptId: 'A_1' });
    expect('needsYou' in (only ?? {})).toBe(false);
  });

  it("merge into the review, its reply drafts with them, and never another attempt's", async () => {
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptDocument
        ? Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'REVIEW' } })
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', replyDrafts: [], autosubmitAt: null } }),
    );
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'REVIEW',
      replyDrafts: [],
      autosubmitAt: null,
    });
    expect(
      graphqlDirect.mock.calls.find(([document]) => document === ContributeAttemptFollowUpsDocument)?.slice(1),
    ).toEqual([{ id: 'A_1' }, { source: 'ssr', githubLogin: 'octocat' }]);

    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptDocument
        ? Promise.resolve({ contributeAttempt: { attemptId: 'A_1' } })
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_2', replyDrafts: [] } }),
    );
    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1' });

    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptDocument ? Promise.resolve({ contributeAttempt: { attemptId: 'A_1' } }) : NOT_YET(),
    );
    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1' });
  });

  it('merge into My contributions by attempt id', async () => {
    graphqlDirect.mockImplementation((document) =>
      document === ContributeContributionsDocument
        ? Promise.resolve({
            contributeContributions: {
              items: [{ attemptId: 'A_1' }],
              totals: { open: 1, merged: 0, closed: 0, costUsd: 1 },
            },
          })
        : document === ContributeContributionsFollowUpsDocument
          ? Promise.resolve({
              contributeContributions: { items: [{ attemptId: 'A_1', needsYou: null, followUps: rounds }] },
            })
          : NOT_YET(),
    );

    expect((await loadContributions())?.items).toEqual([{ attemptId: 'A_1', needsYou: null, followUps: rounds }]);
  });

  it('read the reply drafts of each open pull request, as the signed-in user', async () => {
    graphqlDirect.mockImplementation((document, variables) =>
      document === ContributeReplyDraftsDocument && variables.prId === 'PR_1'
        ? Promise.resolve({ contributeReplyDrafts: [{ draftId: 'D_1' }] })
        : NOT_YET(),
    );

    expect(await loadReplyDrafts('PR_1')).toEqual([{ draftId: 'D_1' }]);
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([{ prId: 'PR_1' }, { source: 'ssr', githubLogin: 'octocat' }]);
    expect(await loadReplyDrafts('PR_2')).toBeUndefined();

    const pr = (prId: string, state: string) => ({ attemptId: prId, pullRequest: { prId, state } });
    expect(
      await loadOpenPrDrafts({
        items: [pr('PR_1', 'OPEN'), pr('PR_2', 'OPEN'), pr('PR_3', 'MERGED')] as never,
        totals: { open: 2, merged: 1, closed: 0, costUsd: 0 },
      }),
    ).toEqual({ PR_1: [{ draftId: 'D_1' }], PR_2: undefined });
    expect(await loadOpenPrDrafts(undefined)).toEqual({});

    auth.mockResolvedValueOnce(null);
    graphqlDirect.mockClear();
    expect(await loadReplyDrafts('PR_1')).toBeUndefined();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("merge the autopilot record's newer fields into the overview's", async () => {
    const overview = {
      contribute: {
        previewAllowed: true,
        contributor: { autopilot: { unlocked: false, mergedCount: 1, closedUnmergedStreak: 0 } },
      },
    };
    graphqlDirect.mockImplementation((document) =>
      document === ContributeOverviewDocument
        ? Promise.resolve(overview)
        : document === ContributeAutopilotDocument
          ? Promise.resolve({
              contribute: { contributor: { autopilot: { mergedToUnlock: 2, lockedAt: null, available: false } } },
            })
          : NOT_YET(),
    );
    expect((await loadContribute())?.contributor?.autopilot).toEqual({
      unlocked: false,
      mergedCount: 1,
      closedUnmergedStreak: 0,
      mergedToUnlock: 2,
      lockedAt: null,
      available: false,
    });

    graphqlDirect.mockImplementation((document) =>
      document === ContributeOverviewDocument ? Promise.resolve(overview) : NOT_YET(),
    );
    const autopilot = (await loadContribute())?.contributor?.autopilot;
    expect(autopilot).toEqual({ unlocked: false, mergedCount: 1, closedUnmergedStreak: 0 });
    expect(autopilot && 'available' in autopilot).toBe(false);
  });
});
