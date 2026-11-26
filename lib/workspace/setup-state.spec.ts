import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadContributeSetup, loadContributeSetupState } = await import('./contribute.data');
const { ContributeSetupDocument, ContributeSetupStateDocument } = await import('./contribute.documents');
const { setupStateOf } = await import('./setup-state');

/** Answers the state with `state` and the older yes or no with `setup`; an Error rejects that read. */
const answer = (state: unknown, setup: unknown = new Error('not asked')) =>
  graphqlDirect.mockImplementation(async (document) => {
    const value = document === ContributeSetupStateDocument ? state : setup;
    if (value instanceof Error) throw value;
    return document === ContributeSetupStateDocument ? { contributeSetupState: value } : { contributeSetup: value };
  });

describe('setupStateOf', () => {
  it("reads the API's five states, and nothing else", () => {
    expect(['NONE', 'SETTING_UP', 'FAILED', 'REMOVED', 'MANAGED_ACCOUNT'].map(setupStateOf)).toEqual([
      'none',
      'setting-up',
      'failed',
      'removed',
      'managed',
    ]);
    for (const odd of ['', 'failed', 'toString', null, undefined, 3]) expect(setupStateOf(odd)).toBeNull();
  });
});

describe('loadContributeSetupState', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'newbie' }, expires: '2099-01-01' });
  });

  it("asks as the session's user and answers the API's state", async () => {
    for (const [api, state] of [
      ['SETTING_UP', 'setting-up'],
      ['FAILED', 'failed'],
      ['REMOVED', 'removed'],
      ['NONE', 'none'],
    ] as const) {
      answer(api);
      expect(await loadContributeSetupState()).toBe(state);
    }
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeSetupStateDocument, undefined, {
      source: 'ssr',
      githubLogin: 'newbie',
    });
    expect(graphqlDirect).not.toHaveBeenCalledWith(ContributeSetupDocument, expect.anything(), expect.anything());
  });

  it('is none, asking nothing, without a session', async () => {
    auth.mockResolvedValueOnce(null);
    expect(await loadContributeSetupState()).toBe('none');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('falls back on the older yes or no when the API does not answer the state: setting up, or failed', async () => {
    answer(new Error('[{"message":"Cannot query field"}]'), true);
    expect(await loadContributeSetupState()).toBe('setting-up');
    answer(new Error('[{"message":"Cannot query field"}]'), false);
    expect(await loadContributeSetupState()).toBe('failed');
    answer('SOMETHING_NEW', true);
    expect(await loadContributeSetupState()).toBe('setting-up');
  });

  it('is failed when neither read answers, so the page offers Try again', async () => {
    answer(new Error('502'), new Error('502'));
    expect(await loadContributeSetupState()).toBe('failed');
  });

  it('answers `managed` for a company-managed account, as the API says, never "being set up"', async () => {
    answer('MANAGED_ACCOUNT');
    expect(await loadContributeSetupState()).toBe('managed');
    expect(await loadContributeSetup()).toBe(false);
  });

  it('gives loadContributeSetup its yes only while the account is being set up', async () => {
    answer('SETTING_UP');
    expect(await loadContributeSetup()).toBe(true);
    for (const api of ['FAILED', 'REMOVED', 'NONE']) {
      answer(api);
      expect(await loadContributeSetup()).toBe(false);
    }
  });
});
