import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { ContributeUnavailableError, loadAttempt, loadAttempts, loadContribute, loadContributions } = await import(
  './contribute.data'
);
const { ContributeGrantDocument, ContributeOverviewDocument } = await import('./contribute.documents');

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
