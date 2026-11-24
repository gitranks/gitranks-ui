import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadContribute, loadFairUseNotice, loadFairUseNotices } = await import('./contribute.data');
const { ContributeIssuesWithRulesDocument, ContributeLimitsDocument, ContributeOverviewDocument } = await import(
  './contribute.documents'
);
const {
  AnswerContributeNoticeDocument,
  AppealFairUseDocument,
  ContributeFairUseNoticeDocument,
  ContributeFairUseNoticesDocument,
  DismissContributeNoticeDocument,
} = await import('./fair-use.documents');
const { answerFairUseNotice, appealFairUse, dismissFairUseNotice, dismissRulesBanner } = await import(
  './fair-use.actions'
);
const { accessClosedNotice, blockNotice, claimRatioWarning, fairUse, fairUseNotice, noFairUse, outsideFixNotice } =
  await import('@/lib/contribute/__fixtures__/fair-use');
const { limits } = await import('@/lib/contribute/__fixtures__/contribute-views');

const notAnswered = () => Promise.reject(new Error('[{"message":"Cannot query field"}]'));

beforeEach(() => {
  graphqlDirect.mockReset();
  auth.mockReset();
  auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
});

describe('loadFairUseNotices', () => {
  it('reads what the top of Contribute shows, as the signed-in user', async () => {
    graphqlDirect.mockResolvedValue({ contributeFairUseNotices: noFairUse });
    expect(await loadFairUseNotices()).toEqual(noFairUse);
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeFairUseNoticesDocument, undefined, {
      source: 'ssr',
      githubLogin: 'octocat',
    });
  });

  it('is null, nothing shown, when hidden, not answered or signed out', async () => {
    graphqlDirect.mockResolvedValueOnce({ contributeFairUseNotices: null });
    expect(await loadFairUseNotices()).toBeNull();
    graphqlDirect.mockImplementationOnce(notAnswered);
    expect(await loadFairUseNotices()).toBeNull();
    auth.mockResolvedValueOnce(null);
    graphqlDirect.mockClear();
    expect(await loadFairUseNotices()).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('loadFairUseNotice', () => {
  it('reads one message by its id, as the signed-in user', async () => {
    graphqlDirect.mockResolvedValue({ contributeFairUseNotice: fairUseNotice() });
    expect(await loadFairUseNotice('583231-outsidePr-1-1')).toEqual(fairUseNotice());
    expect(graphqlDirect).toHaveBeenCalledWith(
      ContributeFairUseNoticeDocument,
      { id: '583231-outsidePr-1-1' },
      { source: 'ssr', githubLogin: 'octocat' },
    );
  });

  it('is null, a 404, for an id the API never gives (not asked), another user’s, a failure or signed out', async () => {
    expect(await loadFairUseNotice('../../etc')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockResolvedValueOnce({ contributeFairUseNotice: null });
    expect(await loadFairUseNotice('583231-outsidePr-1-1')).toBeNull();
    graphqlDirect.mockImplementationOnce(notAnswered);
    expect(await loadFairUseNotice('583231-outsidePr-1-1')).toBeNull();
    auth.mockResolvedValueOnce(null);
    expect(await loadFairUseNotice('583231-outsidePr-1-1')).toBeNull();
  });

  it('reads the messages of the rules of today by their ids too', async () => {
    for (const notice of [outsideFixNotice, claimRatioWarning, accessClosedNotice]) {
      graphqlDirect.mockResolvedValueOnce({ contributeFairUseNotice: notice });
      expect(await loadFairUseNotice(notice.id)).toEqual(notice);
    }
    expect(graphqlDirect).toHaveBeenCalledTimes(3);
  });
});

describe('loadContribute and a fair-use block', () => {
  const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
  const answering = (reason: string | null) =>
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeLimitsDocument) {
        return { contribute: { contributor: { limits: { ...limits.suspended, reason } } } };
      }
      if (document === ContributeFairUseNoticesDocument) {
        return { contributeFairUseNotices: fairUse({ block: blockNotice }) };
      }
      return notAnswered();
    });

  it('reads the block’s message only for an account a fair-use rule blocked', async () => {
    answering('FAIR_USE');
    expect((await loadContribute())?.fairUseBlock).toEqual(blockNotice);

    graphqlDirect.mockClear();
    answering(null);
    const held = await loadContribute();
    expect(held).not.toHaveProperty('fairUseBlock');
    expect(graphqlDirect.mock.calls.some(([document]) => document === ContributeFairUseNoticesDocument)).toBe(false);
  });
});

describe('the fair-use actions', () => {
  it('close a message by its id, or the Terms banner', async () => {
    graphqlDirect.mockResolvedValue({ dismissContributeNotice: true });
    expect(await dismissFairUseNotice('583231-viewing-1-1')).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      DismissContributeNoticeDocument,
      { noticeId: '583231-viewing-1-1' },
      expect.objectContaining({ githubLogin: 'octocat' }),
    );
    expect(await dismissRulesBanner()).toEqual({ ok: true, data: true });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      DismissContributeNoticeDocument,
      { rules: true },
      expect.objectContaining({ githubLogin: 'octocat' }),
    );
    graphqlDirect.mockClear();
    expect(await dismissFairUseNotice('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('send an answer trimmed, and refuse an empty or too long one without asking', async () => {
    graphqlDirect.mockResolvedValue({ answerContributeNotice: fairUseNotice() });
    await answerFairUseNotice({ noticeId: '583231-outsidePr-1-1', choice: ' other ', text: '  Hi  ' });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      AnswerContributeNoticeDocument,
      { noticeId: '583231-outsidePr-1-1', choice: 'other', text: 'Hi' },
      expect.objectContaining({ githubLogin: 'octocat' }),
    );
    await answerFairUseNotice({ noticeId: '583231-outsidePr-2-1', choice: null, text: 'Slow.' });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      AnswerContributeNoticeDocument,
      { noticeId: '583231-outsidePr-2-1', choice: null, text: 'Slow.' },
      expect.anything(),
    );
    graphqlDirect.mockClear();
    expect(await answerFairUseNotice({ noticeId: '583231-outsidePr-2-1', choice: null, text: '  ' })).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    expect(
      await answerFairUseNotice({ noticeId: '583231-outsidePr-2-1', choice: null, text: 'x'.repeat(2001) }),
    ).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await answerFairUseNotice({ noticeId: 'nope', choice: 'other', text: '' })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('ask us to look again in an operation of its own, trimmed, and answer the request as saved', async () => {
    const appeal = { at: '2026-11-24T10:00:00.000Z', answeredAt: null };
    graphqlDirect.mockResolvedValue({ appealFairUse: appeal });
    expect(await appealFairUse('  It was my own repository.  ')).toEqual({ ok: true, data: appeal });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      AppealFairUseDocument,
      { text: 'It was my own repository.' },
      expect.objectContaining({ githubLogin: 'octocat' }),
    );
    expect(print(AppealFairUseDocument)).toContain('appealFairUse(text: $text)');
  });

  it('refuse an empty or too long request without asking', async () => {
    expect(await appealFairUse('   ')).toMatchObject({ ok: false, error: 'INVALID' });
    expect(await appealFairUse('x'.repeat(2001))).toMatchObject({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('say an API that does not take requests yet is not ready, from its answer of today', async () => {
    graphqlDirect.mockImplementation(() =>
      Promise.reject(new Error('[{"message":"Cannot query field \\"appealFairUse\\" on type \\"Mutation\\"."}]')),
    );
    expect(await appealFairUse('Please look again.')).toEqual({ ok: false, error: 'NOT_AVAILABLE_YET' });
  });
});

describe('the list size', () => {
  it('is read with the feed and its repos’ rules', () => {
    expect(print(ContributeIssuesWithRulesDocument)).toMatch(/listSize \{\s*size\s+base\s+tier\s+merged\s+cut\s*\}/);
  });
});
