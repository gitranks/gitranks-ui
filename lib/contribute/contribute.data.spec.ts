import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, auth } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const {
  ContributeUnavailableError,
  loadAttempt,
  loadAttempts,
  loadAttemptsIn,
  loadContribute,
  loadContributeSet,
  loadContributions,
  loadOpenPrDrafts,
  loadOverviewImpact,
  loadOverviewNeeds,
  loadOverviewNow,
  loadProviderInterests,
  loadReplyDrafts,
} = await import('./contribute.data');
const {
  ContributeAttemptDocument,
  ContributeAttemptFollowUpsDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAttemptsInDocument,
  ContributeAttemptsInFollowUpsDocument,
  ContributeAttemptsInOwnAgentDocument,
  ContributeAttemptsInReviewAtDocument,
  ContributeAttemptReviewReasonDocument,
  ContributeAutopilotDocument,
  ContributeAutopilotNoticeDocument,
  ContributeImpactDocument,
  ContributeImpactReposDocument,
  ContributeRepliesWaitingDocument,
  ContributeScheduleCountsDocument,
  ContributeContributionsDocument,
  ContributeContributionsFollowUpsDocument,
  ContributeGrantDocument,
  ContributeAttemptsOpenDocument,
  ContributeAttemptDcoDocument,
  ContributeOnboardingDocument,
  ContributeOverviewDocument,
  ContributeProviderInterestsDocument,
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

  it('adds the onboarding stamp and whether attempts are open, when the API answers them', async () => {
    const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeOnboardingDocument) {
        return { contribute: { contributor: { onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'MCP' } } };
      }
      if (document === ContributeAttemptsOpenDocument) return { contribute: { attemptsOpen: false } };
      throw new Error('[{"message":"Cannot query field"}]');
    });

    expect(await loadContribute()).toMatchObject({
      contributor: { login: 'octocat', onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'MCP' },
      attemptsOpen: false,
    });
  });

  it('keeps the onboarding stamp when whether attempts are open fails to read', async () => {
    const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeOnboardingDocument) {
        return { contribute: { contributor: { onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'HOSTED' } } };
      }
      throw new Error('[{"message":"Cannot query field"}]');
    });

    const view = await loadContribute();
    expect(view?.contributor).toMatchObject({ onboardedAt: '2026-10-30T09:00:00.000Z' });
    expect(view).not.toHaveProperty('attemptsOpen');
  });

  it('leaves the onboarding fields out while the API does not answer them', async () => {
    answer(async () => ({ contribute: { previewAllowed: true, contributor: { status: 'ACTIVE', autopilot: null } } }));

    const view = await loadContribute();
    expect(view?.contributor).not.toHaveProperty('onboardedAt');
    expect(view?.contributor).not.toHaveProperty('onboardedVia');
    expect(view).not.toHaveProperty('attemptsOpen');
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

describe('loadAttempt: whether the repo requires DCO, read on its own', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const answering = (dco: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptDcoDocument
        ? dco()
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'REVIEW' } }),
    );

  it("merges the attempt's own answer, and leaves the field out otherwise", async () => {
    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', dcoRequired: true } }));
    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1', state: 'REVIEW', dcoRequired: true });

    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', dcoRequired: false } }));
    expect(await loadAttempt('A_1')).toMatchObject({ dcoRequired: false });

    // Another attempt's answer, an API without the field, or a failed read: not known, so the form asks as before.
    for (const dco of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', dcoRequired: false } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"dcoRequired\\""}]')),
      () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')),
    ]) {
      answering(dco);
      const read = await loadAttempt('A_1');
      expect(read).toEqual({ attemptId: 'A_1', state: 'REVIEW' });
      expect('dcoRequired' in (read ?? {})).toBe(false);
    }
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

    const ran = { used: 1, left: 1, max: 2, handedOff: false, handedOffAt: null, currentAttemptId: null };
    const pr = (prId: string, state: string, followUps?: object) => ({
      attemptId: prId,
      pullRequest: { prId, state },
      ...(followUps ? { followUps } : {}),
    });
    expect(
      await loadOpenPrDrafts({
        items: [pr('PR_1', 'OPEN', ran), pr('PR_2', 'OPEN', ran), pr('PR_3', 'MERGED', ran)] as never,
        totals: { open: 2, merged: 1, closed: 0, costUsd: 0 },
      }),
    ).toEqual({ PR_1: [{ draftId: 'D_1' }], PR_2: undefined });
    expect(await loadOpenPrDrafts(undefined)).toEqual({});

    auth.mockResolvedValueOnce(null);
    graphqlDirect.mockClear();
    expect(await loadReplyDrafts('PR_1')).toBeUndefined();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('read drafts only for open pull requests a follow-up ran on, at most 10, and none without the rounds', async () => {
    graphqlDirect.mockResolvedValue({ contributeReplyDrafts: [] });
    const rounds = (patch: object) => ({
      used: 0,
      left: 2,
      max: 2,
      handedOff: false,
      handedOffAt: null,
      currentAttemptId: null,
      ...patch,
    });
    const pr = (prId: string, followUps?: object) => ({
      attemptId: prId,
      pullRequest: { prId, state: 'OPEN' },
      ...(followUps ? { followUps } : {}),
    });
    const page = (items: unknown[]) => ({
      items: items as never,
      totals: { open: items.length, merged: 0, closed: 0, costUsd: 0 },
    });

    // No follow-up ever ran, or the API does not answer the rounds: nothing more is asked.
    expect(await loadOpenPrDrafts(page([pr('PR_1', rounds({})), pr('PR_2'), pr('PR_3')]))).toEqual({});
    expect(graphqlDirect).not.toHaveBeenCalled();

    // A round used, or one under way: asked. Twelve of them: the first ten.
    const ran = Array.from({ length: 12 }, (_, index) =>
      pr(`PR_R${index}`, index % 2 ? rounds({ used: 1 }) : rounds({ currentAttemptId: `A_${index}` })),
    );
    const read = await loadOpenPrDrafts(page([pr('PR_0', rounds({})), ...ran]));
    expect(Object.keys(read)).toEqual(ran.slice(0, 10).map(({ attemptId }) => attemptId));
    expect(graphqlDirect).toHaveBeenCalledTimes(10);
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables.prId)).not.toContain('PR_0');
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

    // Where its emails go, read on its own: a known "none" is kept as null.
    for (const noticeTo of ['m•••@gmail.com', null]) {
      graphqlDirect.mockImplementation((document) =>
        document === ContributeOverviewDocument
          ? Promise.resolve(overview)
          : document === ContributeAutopilotNoticeDocument
            ? Promise.resolve({ contribute: { contributor: { autopilot: { noticeTo } } } })
            : NOT_YET(),
      );
      expect((await loadContribute())?.contributor?.autopilot).toMatchObject({ noticeTo });
    }
  });

  it('merge why autopilot left an attempt for the review into it, and never another attempt’s', async () => {
    const answer = (reviewReason: { attemptId: string; reviewReason: string | null }) =>
      graphqlDirect.mockImplementation((document) =>
        document === ContributeAttemptDocument
          ? Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'REVIEW' } })
          : document === ContributeAttemptReviewReasonDocument
            ? Promise.resolve({ contributeAttempt: reviewReason })
            : NOT_YET(),
      );
    answer({ attemptId: 'A_1', reviewReason: 'notice_late' });
    expect(await loadAttempt('A_1')).toMatchObject({ reviewReason: 'notice_late' });
    answer({ attemptId: 'A_2', reviewReason: 'notice_late' });
    expect(await loadAttempt('A_1')).not.toHaveProperty('reviewReason');
  });
});

describe('loadProviderInterests', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it("reads the user's list in an operation of its own, as the user", async () => {
    graphqlDirect.mockResolvedValue({ contribute: { providerInterests: ['COPILOT', 'XAI'] } });

    expect(await loadProviderInterests()).toEqual(['COPILOT', 'XAI']);
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeProviderInterestsDocument, undefined, {
      source: 'ssr',
      githubLogin: 'octocat',
    });
  });

  it('is empty when the API does not answer it, answers nothing, or there is no session', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"providerInterests\\""}]'));
    expect(await loadProviderInterests()).toEqual([]);
    graphqlDirect.mockResolvedValueOnce({ contribute: null });
    expect(await loadProviderInterests()).toEqual([]);
    graphqlDirect.mockResolvedValueOnce({ contribute: { providerInterests: null } });
    expect(await loadProviderInterests()).toEqual([]);

    auth.mockResolvedValueOnce(null);
    expect(await loadProviderInterests()).toEqual([]);
    expect(graphqlDirect).toHaveBeenCalledTimes(3);
  });
});

describe("Overview's loaders, each operation settled on its own", () => {
  const notYet = () => Promise.reject(new Error('[{"message":"Cannot query field"}]'));
  const row = (attemptId: string, state = 'REVIEW') => ({ attemptId, state, updatedAt: '2026-10-28T10:00:00.000Z' });

  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it('reads attempts in several states at once, with their follow-up and own-agent fields', async () => {
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeAttemptsInDocument) return { contributeAttempts: [row('A_1', 'RUNNING')] };
      if (document === ContributeAttemptsInFollowUpsDocument) {
        return { contributeAttempts: [{ attemptId: 'A_1', autosubmitAt: null }] };
      }
      if (document === ContributeAttemptsInOwnAgentDocument)
        return { contributeAttempts: [{ attemptId: 'A_1', runner: 'MCP' }] };
      return notYet();
    });

    expect(await loadAttemptsIn(['CLAIMING', 'RUNNING', 'CHECKS'], 5)).toEqual([
      { ...row('A_1', 'RUNNING'), autosubmitAt: null, runner: 'MCP' },
    ]);
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([
      { states: ['CLAIMING', 'RUNNING', 'CHECKS'], first: 5 },
      { source: 'ssr', githubLogin: 'octocat' },
    ]);

    graphqlDirect.mockImplementation(notYet);
    expect(await loadAttemptsIn(['REVIEW'])).toBeUndefined();
  });

  it('merges reviewAt into the reviews by id, and leaves it out when it is not answered', async () => {
    graphqlDirect.mockImplementation(async (document, variables) => {
      if (document === ContributeAttemptsInDocument) {
        expect(variables).toEqual({ states: ['REVIEW', 'PENDING_AUTOSUBMIT'], first: 50 });
        return { contributeAttempts: [row('A_1'), row('A_2')] };
      }
      if (document === ContributeAttemptsInReviewAtDocument) {
        return { contributeAttempts: [{ attemptId: 'A_2', reviewAt: '2026-10-27T00:00:00.000Z' }] };
      }
      if (document === ContributeRepliesWaitingDocument) return { contributeRepliesWaiting: [] };
      return notYet();
    });

    const needs = await loadOverviewNeeds();
    expect(needs.replies).toEqual([]);
    expect(needs.reviews?.map((attempt) => attempt.reviewAt)).toEqual([undefined, '2026-10-27T00:00:00.000Z']);
  });

  it('leaves the replies undefined when they are not answered, and the reviews when the attempts are not', async () => {
    graphqlDirect.mockImplementation(async (document) =>
      document === ContributeAttemptsInDocument ? { contributeAttempts: [row('A_1')] } : notYet(),
    );
    expect(await loadOverviewNeeds()).toEqual({ reviews: [row('A_1')], replies: undefined });

    graphqlDirect.mockImplementation(async (document) =>
      document === ContributeRepliesWaitingDocument ? { contributeRepliesWaiting: [] } : notYet(),
    );
    expect(await loadOverviewNeeds()).toEqual({ reviews: undefined, replies: [] });
  });

  it('reads the attempts in flight and the scheduler counts on their own', async () => {
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeAttemptsInDocument) return { contributeAttempts: [] };
      if (document === ContributeScheduleCountsDocument) {
        return { contribute: { contributor: { scheduleCounts: { prBound: 2, queued: 0 } } } };
      }
      return notYet();
    });
    expect(await loadOverviewNow()).toEqual({ inFlight: [], scheduleCounts: { prBound: 2, queued: 0 } });

    graphqlDirect.mockImplementation(async (document) =>
      document === ContributeAttemptsInDocument ? { contributeAttempts: [] } : notYet(),
    );
    expect(await loadOverviewNow()).toEqual({ inFlight: [], scheduleCounts: undefined });
  });

  it('reads the totals, and repos helped on its own', async () => {
    const totals = { open: 2, merged: 7, closed: 1 };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeImpactDocument) return { contributeContributions: { totals } };
      if (document === ContributeImpactReposDocument)
        return { contributeContributions: { totals: { reposHelped: 6 } } };
      return notYet();
    });
    expect(await loadOverviewImpact()).toEqual({ ...totals, reposHelped: 6 });

    graphqlDirect.mockImplementation(async (document) =>
      document === ContributeImpactDocument ? { contributeContributions: { totals } } : notYet(),
    );
    expect(await loadOverviewImpact()).toEqual(totals);

    graphqlDirect.mockImplementation(notYet);
    expect(await loadOverviewImpact()).toBeUndefined();
  });

  it('reads nothing without a session', async () => {
    auth.mockResolvedValue(null);

    expect(await loadOverviewNeeds()).toEqual({ reviews: undefined, replies: undefined });
    expect(await loadOverviewNow()).toEqual({ inFlight: undefined, scheduleCounts: undefined });
    expect(await loadOverviewImpact()).toBeUndefined();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('what the user works on', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
  });

  it('is not even asked for a login the modes are not shown to', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    expect(await loadContributeSet()).toBeNull();
    auth.mockResolvedValue(null);
    expect(await loadContributeSet()).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('is read as the user the modes are shown to; null when hidden, undefined when not answered', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'maslianok' }, expires: '2099-01-01' });
    graphqlDirect.mockResolvedValueOnce({ contributeSet: { mode: 'STACK' } });
    expect(await loadContributeSet()).toEqual({ mode: 'STACK' });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'maslianok' });

    graphqlDirect.mockResolvedValueOnce({ contributeSet: null });
    expect(await loadContributeSet()).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502'));
    expect(await loadContributeSet()).toBeUndefined();
  });
});
