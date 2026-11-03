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
  loadOverviewImpact,
  loadOverviewNeeds,
  loadOverviewNow,
  loadProviderInterests,
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
  ContributeAttemptHoldDocument,
  ContributeAttemptReviewReasonDocument,
  ContributeAttemptRetryDocument,
  ContributeAutopilotDocument,
  ContributeAutopilotNoticeDocument,
  ContributeImpactDocument,
  ContributeLimitsDocument,
  ContributeImpactReposDocument,
  ContributeRepliesWaitingDocument,
  ContributeScheduleCountsDocument,
  ContributeContributionsDocument,
  ContributeContributionsFollowUpsDocument,
  ContributeGrantDocument,
  ContributeAttemptsOpenDocument,
  ContributeAttemptCheckStopDocument,
  ContributeAttemptDecisionsDocument,
  ContributeAttemptDcoDocument,
  ContributeAttemptDisclosureDocument,
  ContributeOnboardingDocument,
  ContributeOverviewDocument,
  ContributeProviderInterestsDocument,
  ContributeContributionsMovesDocument,
  ContributeContributionsFixesDocument,
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

  it('adds the limits when the API answers them, and leaves them out when it does not', async () => {
    const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
    const limits = {
      level: 'REDUCED',
      reason: 'NEW_ACCOUNT',
      attemptsAtATime: 1,
      openPrsAtATime: 2,
      claimsPerDay: 3,
      revealsPerDay: 40,
    };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeLimitsDocument) return { contribute: { contributor: { limits } } };
      throw new Error('[{"message":"Cannot query field"}]');
    });
    expect((await loadContribute())?.contributor?.limits).toEqual(limits);

    answer(async () => ({ contribute: { previewAllowed: true, contributor } }));
    expect((await loadContribute())?.contributor).not.toHaveProperty('limits');
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

describe('loadAttempt: the PR footer and co-author, read on their own', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const answering = (disclosure: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptDisclosureDocument
        ? disclosure()
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'REVIEW' } }),
    );

  it("merges the attempt's own answer, a missing co-author as unknown, and leaves both out otherwise", async () => {
    answering(() =>
      Promise.resolve({
        contributeAttempt: { attemptId: 'A_1', prFooter: '<sub>Made with</sub>', prCoAuthored: false },
      }),
    );
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'REVIEW',
      prFooter: '<sub>Made with</sub>',
      prCoAuthored: false,
    });

    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', prFooter: '<sub>Made with</sub>' } }));
    expect(await loadAttempt('A_1')).toMatchObject({ prCoAuthored: null });

    // Another attempt's answer, an API without the fields, or a failed read: the form falls back as before.
    for (const disclosure of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', prFooter: 'x', prCoAuthored: true } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"prFooter\\""}]')),
      () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')),
    ]) {
      answering(disclosure);
      const read = await loadAttempt('A_1');
      expect(read).toEqual({ attemptId: 'A_1', state: 'REVIEW' });
      expect('prFooter' in (read ?? {})).toBe(false);
    }
  });
});

describe('loadAttempt: a check that ran out, read on its own', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const answering = (stop: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptCheckStopDocument
        ? stop()
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'STOPPED' } }),
    );

  it("merges the attempt's own answer, and leaves the field out otherwise", async () => {
    answering(() =>
      Promise.resolve({ contributeAttempt: { attemptId: 'A_1', checkLimit: { limit: 'budget', decided: false } } }),
    );
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'STOPPED',
      checkLimit: { limit: 'budget', decided: false },
    });

    for (const stop of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', checkLimit: null } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"checkLimit\\""}]')),
    ]) {
      answering(stop);
      const read = await loadAttempt('A_1');
      expect(read).toEqual({ attemptId: 'A_1', state: 'STOPPED' });
      expect('checkLimit' in (read ?? {})).toBe(false);
    }
  });
});

describe('loadAttempt: whether a stop can be tried again, read on its own', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const goNoGo = { verdict: 'no_go', reason: 'Someone is on it.', decidedAtLimit: null, at: '2026-11-03T10:00:00Z' };
  const answering = (retry: () => Promise<unknown>, decisions: unknown = { attemptId: 'A_1', goNoGo, brief: null }) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptRetryDocument
        ? retry()
        : document === ContributeAttemptDecisionsDocument
          ? Promise.resolve({ contributeAttempt: decisions })
          : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'STOPPED' } }),
    );

  it("merges the retry and the no-go's release into the attempt's own go/no-go", async () => {
    const retry = { kind: 'OVERRIDE', takenBy: ['mira-k'] };
    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', retry, goNoGo: { release: 'taken' } } }));
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'STOPPED',
      retry,
      goNoGo: { ...goNoGo, release: 'taken' },
      brief: null,
    });

    // Not to be tried again, and a run with no go/no-go: nothing to add the release to.
    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', retry: null, goNoGo: null } }), {
      attemptId: 'A_1',
      goNoGo: null,
      brief: null,
    });
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'STOPPED',
      retry: null,
      goNoGo: null,
      brief: null,
    });
  });

  it("leaves the retry and the release out for another attempt's answer or an API without them", async () => {
    for (const retry of [
      () =>
        Promise.resolve({
          contributeAttempt: { attemptId: 'A_2', retry: { kind: 'BOOST', takenBy: [] }, goNoGo: { release: 'taken' } },
        }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"retry\\""}]')),
    ]) {
      answering(retry);
      const read = await loadAttempt('A_1');
      expect(read).toEqual({ attemptId: 'A_1', state: 'STOPPED', goNoGo, brief: null });
      expect('retry' in (read ?? {})).toBe(false);
    }
  });
});

describe("loadAttempt: the agent's decisions, read on their own", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const answering = (decisions: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptDecisionsDocument
        ? decisions()
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'STOPPED' } }),
    );
  const goNoGo = { verdict: 'no_go', reason: 'Fixed upstream.', decidedAtLimit: null, at: '2026-11-02T10:00:00Z' };

  it("merges the attempt's own answer, an older run's nulls too, and leaves both fields out otherwise", async () => {
    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', goNoGo, brief: 'Fixed upstream.' } }));
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'STOPPED',
      goNoGo,
      brief: 'Fixed upstream.',
    });

    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', goNoGo: null, brief: null } }));
    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1', state: 'STOPPED', goNoGo: null, brief: null });

    for (const decisions of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', goNoGo, brief: 'x' } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"goNoGo\\""}]')),
    ]) {
      answering(decisions);
      const read = await loadAttempt('A_1');
      expect(read).toEqual({ attemptId: 'A_1', state: 'STOPPED' });
      expect('goNoGo' in (read ?? {})).toBe(false);
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
  const rounds = {
    used: 1,
    autopilotRuns: 0,
    autopilotMax: 2,
    manualRuns: 1,
    recommended: false,
    currentAttemptId: null,
  };

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

  it('merges a hold’s source and the issue’s first-timers label, never another attempt’s, nothing from an older API', async () => {
    const answer = (hold: Promise<unknown>) =>
      graphqlDirect.mockImplementation((document) =>
        document === ContributeAttemptDocument
          ? Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'REVIEW' } })
          : document === ContributeAttemptHoldDocument
            ? hold
            : NOT_YET(),
      );
    const read = { reviewReasonSource: 'good first issue', newcomersLabel: 'first-timers-only' };
    answer(Promise.resolve({ contributeAttempt: { attemptId: 'A_1', ...read } }));
    expect(await loadAttempt('A_1')).toMatchObject(read);
    answer(Promise.resolve({ contributeAttempt: { attemptId: 'A_2', ...read } }));
    expect(await loadAttempt('A_1')).not.toHaveProperty('newcomersLabel');
    answer(NOT_YET());
    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1', state: 'REVIEW' });
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
      if (document === ContributeAttemptsInDocument && variables.first === 50) {
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
    graphqlDirect.mockImplementation(async (document, variables) =>
      document === ContributeAttemptsInDocument
        ? { contributeAttempts: [row('A_1', variables.first === 50 ? 'REVIEW' : 'RUNNING')] }
        : notYet(),
    );
    expect(await loadOverviewNeeds()).toEqual({
      reviews: [row('A_1')],
      replies: undefined,
      contributions: undefined,
      runs: [row('A_1', 'RUNNING')],
    });

    graphqlDirect.mockImplementation(async (document) =>
      document === ContributeRepliesWaitingDocument ? { contributeRepliesWaiting: [] } : notYet(),
    );
    expect(await loadOverviewNeeds()).toEqual({
      reviews: undefined,
      replies: [],
      contributions: undefined,
      runs: undefined,
    });
  });

  it("reads the open pull requests for Needs you, with the runs' signals and the fixes on their own", async () => {
    const rounds = {
      used: 1,
      autopilotRuns: 0,
      autopilotMax: 2,
      manualRuns: 1,
      recommended: false,
      currentAttemptId: null,
    };
    const ended = {
      kind: 'RUN_ENDED',
      at: '2026-10-28T10:00:00.000Z',
      detail: 'Add proof',
      attemptId: 'A_F1',
      round: 1,
      outcome: 'NO_GO',
    };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeContributionsDocument) {
        return {
          contributeContributions: {
            items: [{ attemptId: 'A_1' }],
            totals: { open: 1, merged: 0, closed: 0, costUsd: 1 },
          },
        };
      }
      if (document === ContributeContributionsFollowUpsDocument) {
        return {
          contributeContributions: {
            items: [
              {
                attemptId: 'A_1',
                needsYou: { since: 'x', signals: [{ kind: 'RUN_ENDED', at: ended.at, detail: 'Add proof' }] },
                followUps: rounds,
              },
            ],
          },
        };
      }
      if (document === ContributeContributionsMovesDocument) {
        return {
          contributeContributions: {
            items: [
              { attemptId: 'A_1', needsYou: { since: 'x', signals: [ended] }, followUps: { lastEndedAt: ended.at } },
            ],
          },
        };
      }
      if (document === ContributeContributionsFixesDocument) {
        return {
          contributeContributions: { items: [{ attemptId: 'A_1', prFix: null, prIssues: [], conventions: null }] },
        };
      }
      return notYet();
    });
    expect(await loadOverviewNeeds()).toMatchObject({
      contributions: [
        {
          attemptId: 'A_1',
          needsYou: { since: 'x', signals: [ended] },
          followUps: { ...rounds, lastEndedAt: ended.at },
          prFix: null,
          prIssues: [],
          conventions: null,
        },
      ],
    });

    // An API without the newer reads: the follow-up fields as they were.
    graphqlDirect.mockImplementation(async (document) =>
      document === ContributeContributionsMovesDocument || document === ContributeContributionsFixesDocument
        ? notYet()
        : document === ContributeContributionsDocument
          ? {
              contributeContributions: {
                items: [{ attemptId: 'A_1' }],
                totals: { open: 1, merged: 0, closed: 0, costUsd: 1 },
              },
            }
          : document === ContributeContributionsFollowUpsDocument
            ? { contributeContributions: { items: [{ attemptId: 'A_1', needsYou: null, followUps: rounds }] } }
            : notYet(),
    );
    expect((await loadOverviewNeeds()).contributions).toEqual([
      { attemptId: 'A_1', needsYou: null, followUps: rounds },
    ]);
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
