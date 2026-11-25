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
  loadContributeEmailSettings,
  loadContributeSet,
  loadProviderInterests,
  loadRepliesWaiting,
  ownAgentOf,
} = await import('./contribute.data');
const { loadIssues } = await import('@/lib/contribute/contribute.data');
const {
  ContributeAttemptDocument,
  ContributeAttemptFollowUpsDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAttemptHoldDocument,
  ContributeAttemptReviewReasonDocument,
  ContributeAttemptRetryDocument,
  ContributeAutopilotDocument,
  ContributeAutopilotNoticeDocument,
  ContributeLimitsDocument,
  ContributeRepliesWaitingDocument,
  ContributeRepliesWaitingPlanDocument,
  ContributeAttemptOneCommentFirstDocument,
  ContributeAttemptRepliesPlanDocument,
  ContributeGrantDocument,
  ContributeAttemptCheckNotesDocument,
  ContributeAttemptCheckStopDocument,
  ContributeAttemptDecisionsDocument,
  ContributeAttemptDcoDocument,
  ContributeAttemptDisclosureDocument,
  ContributeAttemptRepoRulesDocument,
  ContributeIssuesMaskedDocument,
  ContributeOnboardingDocument,
  ContributeOverviewDocument,
  ContributeProviderInterestsDocument,
  ContributeEmailSettingsDocument,
  ContributeSignsDocument,
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

    expect(await loadContribute()).toMatchObject({ contributor: null, grant: undefined });
    expect(graphqlDirect.mock.calls.some(([document]) => document === ContributeGrantDocument)).toBe(true);
  });

  it('adds the onboarding stamp when the API answers it', async () => {
    const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeOnboardingDocument) {
        return { contribute: { contributor: { onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'MCP' } } };
      }
      throw new Error('[{"message":"Cannot query field"}]');
    });

    expect(await loadContribute()).toMatchObject({
      contributor: { login: 'octocat', onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'MCP' },
    });
  });

  it('leaves the onboarding fields out while the API does not answer them', async () => {
    answer(async () => ({ contribute: { previewAllowed: true, contributor: { status: 'ACTIVE', autopilot: null } } }));

    const view = await loadContribute();
    expect(view?.contributor).not.toHaveProperty('onboardedAt');
    expect(view?.contributor).not.toHaveProperty('onboardedVia');
  });

  it('adds the two signs from their own read, and leaves them out (not known) when that read fails', async () => {
    const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeOnboardingDocument) {
        return { contribute: { contributor: { onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'MCP' } } };
      }
      if (document === ContributeSignsDocument) {
        return { contribute: { contributor: { contributeOnboardedAt: '2026-11-25T09:00:00.000Z', learnOnboardedAt: null } } };
      }
      throw new Error('[{"message":"Cannot query field"}]');
    });
    expect((await loadContribute())?.contributor).toMatchObject({
      onboardedAt: '2026-10-30T09:00:00.000Z',
      contributeOnboardedAt: '2026-11-25T09:00:00.000Z',
      learnOnboardedAt: null,
    });

    graphqlDirect.mockImplementation(async (document) => {
      if (document === ContributeOverviewDocument) return { contribute: { previewAllowed: true, contributor } };
      if (document === ContributeOnboardingDocument) {
        return { contribute: { contributor: { onboardedAt: '2026-10-30T09:00:00.000Z', onboardedVia: 'MCP' } } };
      }
      throw new Error('GraphQL error! 502: Bad Gateway');
    });
    const view = await loadContribute();
    expect(view?.contributor).toMatchObject({ onboardedAt: '2026-10-30T09:00:00.000Z' });
    expect(view?.contributor).not.toHaveProperty('contributeOnboardedAt');
    expect(view?.contributor).not.toHaveProperty('learnOnboardedAt');
  });

  it('adds the limits when the API answers them, and leaves them out when it does not', async () => {
    const contributor = { status: 'ACTIVE', login: 'octocat', autopilot: null };
    const limits = {
      level: 'STANDARD',
      reason: null,
      attemptsAtATime: 3,
      openPrsAtATime: 10,
      claimsPerDay: 10,
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

describe("loadAttempt: the repo's rules, read on their own", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const RULES = { manualOnly: false, lines: [], caps: { lines: 400, files: 15, linesSource: null, filesSource: null } };
  const answering = (rules: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptRepoRulesDocument
        ? rules()
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'REVIEW' } }),
    );

  it("merges the attempt's own answer, null included, and leaves the field out otherwise", async () => {
    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', repoRules: RULES } }));
    expect(await loadAttempt('A_1')).toEqual({ attemptId: 'A_1', state: 'REVIEW', repoRules: RULES });

    answering(() => Promise.resolve({ contributeAttempt: { attemptId: 'A_1', repoRules: null } }));
    expect(await loadAttempt('A_1')).toMatchObject({ repoRules: null });

    for (const rules of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', repoRules: RULES } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"repoRules\\""}]')),
      () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')),
    ]) {
      answering(rules);
      expect('repoRules' in ((await loadAttempt('A_1')) ?? {})).toBe(false);
    }
  });
});

describe("loadAttempt: the pull request's check notes and a run's check verdicts, read on their own", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const NOTES = [{ name: 'Fast checks', kind: 'NOT_PR', why: 'It fails on the base branch too.', by: null, round: 3 }];
  const VERDICTS = [{ name: 'lint', whose: 'PR', why: 'The new file misses a semicolon.' }];
  const answering = (notes: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) =>
      document === ContributeAttemptCheckNotesDocument
        ? notes()
        : Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'PR_OPEN' } }),
    );

  it("asks for both lists in one operation of its own, by the attempt's id", async () => {
    answering(() =>
      Promise.resolve({ contributeAttempt: { attemptId: 'A_1', checkNotes: NOTES, checkVerdicts: null } }),
    );
    await loadAttempt('A_1');
    const asked = graphqlDirect.mock.calls.find(([document]) => document === ContributeAttemptCheckNotesDocument);
    expect(asked?.[1]).toEqual({ id: 'A_1' });
    const source = ContributeAttemptCheckNotesDocument.loc?.source.body ?? '';
    expect(source).toContain('checkNotes { name kind why by round }');
    expect(source).toContain('checkVerdicts { name whose why }');
  });

  it("merges the attempt's own answer, nulls included, and leaves both fields out otherwise", async () => {
    answering(() =>
      Promise.resolve({ contributeAttempt: { attemptId: 'A_1', checkNotes: NOTES, checkVerdicts: null } }),
    );
    expect(await loadAttempt('A_1')).toEqual({
      attemptId: 'A_1',
      state: 'PR_OPEN',
      checkNotes: NOTES,
      checkVerdicts: null,
    });

    answering(() =>
      Promise.resolve({ contributeAttempt: { attemptId: 'A_1', checkNotes: null, checkVerdicts: VERDICTS } }),
    );
    expect(await loadAttempt('A_1')).toMatchObject({ checkNotes: null, checkVerdicts: VERDICTS });

    for (const notes of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', checkNotes: NOTES, checkVerdicts: VERDICTS } }),
      () => Promise.resolve({ contributeAttempt: null }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"checkNotes\\""}]')),
      () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')),
    ]) {
      answering(notes);
      const read = (await loadAttempt('A_1')) ?? {};
      expect(['checkNotes' in read, 'checkVerdicts' in read]).toEqual([false, false]);
      expect(read).toEqual({ attemptId: 'A_1', state: 'PR_OPEN' });
    }
  });
});

describe("loadAttempt: the run's replies plan, read on its own", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const draft = { draftId: 'D_1', state: 'FAILED' };
  const PLAN = {
    attemptId: 'A_1',
    threadRepliesBlocked: {
      org: 'driftwood-js',
      since: '2026-10-21T09:00:00.000Z',
      lastRefusedAt: '2026-10-28T11:00:00.000Z',
    },
    probeFirst: true,
    oneComment: { draftIds: ['D_1'], bodies: ['A reply to a review comment…'] },
    copyBodies: ['A reply to a review comment…'],
    replyBatches: [],
    replyDrafts: [{ draftId: 'D_1', postAs: 'THREAD', batchId: null, canGoInOneComment: true }],
  };
  const answering = (plan: () => Promise<unknown>) =>
    graphqlDirect.mockImplementation((document) => {
      if (document === ContributeAttemptRepliesPlanDocument) return plan();
      if (document === ContributeAttemptFollowUpsDocument)
        return Promise.resolve({ contributeAttempt: { attemptId: 'A_1', replyDrafts: [draft] } });
      return Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'DONE' } });
    });

  it("merges the run's plan and each reply's, and leaves them out otherwise", async () => {
    answering(() => Promise.resolve({ contributeAttempt: PLAN }));
    expect(await loadAttempt('A_1')).toMatchObject({
      threadRepliesBlocked: PLAN.threadRepliesBlocked,
      probeFirst: true,
      oneComment: PLAN.oneComment,
      copyBodies: PLAN.copyBodies,
      replyBatches: [],
      replyDrafts: [{ draftId: 'D_1', state: 'FAILED', postAs: 'THREAD', canGoInOneComment: true }],
    });

    for (const plan of [
      () => Promise.resolve({ contributeAttempt: { ...PLAN, attemptId: 'A_2' } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"probeFirst\\""}]')),
      () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')),
    ]) {
      answering(plan);
      const read = await loadAttempt('A_1');
      expect('probeFirst' in (read ?? {})).toBe(false);
      expect(read?.replyDrafts).toEqual([draft]);
    }
  });

  it("merges the one-comment-first flag and each reply's comment reason; an older API keeps the plan", async () => {
    const posted = { draftId: 'D_1', state: 'POSTED' };
    const reading = (oneCommentFirst: () => Promise<unknown>) =>
      graphqlDirect.mockImplementation((document) => {
        if (document === ContributeAttemptOneCommentFirstDocument) return oneCommentFirst();
        if (document === ContributeAttemptRepliesPlanDocument)
          return Promise.resolve({ contributeAttempt: { ...PLAN, probeFirst: false } });
        if (document === ContributeAttemptFollowUpsDocument)
          return Promise.resolve({ contributeAttempt: { attemptId: 'A_1', replyDrafts: [posted] } });
        return Promise.resolve({ contributeAttempt: { attemptId: 'A_1', state: 'DONE' } });
      });
    reading(() =>
      Promise.resolve({
        contributeAttempt: {
          attemptId: 'A_1',
          oneCommentFirst: true,
          replyDrafts: [{ draftId: 'D_1', commentReason: 'org_restricted' }],
        },
      }),
    );
    expect(await loadAttempt('A_1')).toMatchObject({
      probeFirst: false,
      oneCommentFirst: true,
      replyDrafts: [{ draftId: 'D_1', state: 'POSTED', postAs: 'THREAD', commentReason: 'org_restricted' }],
    });

    for (const oneCommentFirst of [
      () => Promise.resolve({ contributeAttempt: { attemptId: 'A_2', oneCommentFirst: true } }),
      () => Promise.reject(new Error('[{"message":"Cannot query field \\"oneCommentFirst\\""}]')),
      () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway')),
    ]) {
      reading(oneCommentFirst);
      const read = await loadAttempt('A_1');
      expect('oneCommentFirst' in (read ?? {})).toBe(false);
      expect(read).toMatchObject({ probeFirst: false, threadRepliesBlocked: PLAN.threadRepliesBlocked });
      expect(read?.replyDrafts?.[0] && 'commentReason' in read.replyDrafts[0]).toBe(false);
    }
  });
});

describe("loadIssues: the repos' rules with the feed", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  const PAGE = { items: [], next: null, total: 0, computedAt: null };

  it('reads the feed with each masked form, a row without a node id keyed by its mask id', async () => {
    const items = [
      { issueId: 'I_1', masked: null },
      { issueId: null, masked: { id: 'q7k2m9xa', title: 'Tags show twice' } },
    ];
    graphqlDirect.mockResolvedValue({ contributeIssues: { ...PAGE, items } });
    expect((await loadIssues({}))?.items.map(({ issueId }) => issueId)).toEqual(['I_1', 'mask:q7k2m9xa']);
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([ContributeIssuesMaskedDocument]);
  });

  it('is undefined on an outage, or an API that does not know a field it asks, asked once', async () => {
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await loadIssues({})).toBeUndefined();
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValue(
      new Error('[{"message":"Cannot query field \\"masked\\" on type \\"ContributeIssue\\"."}]'),
    );
    expect(await loadIssues({})).toBeUndefined();
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
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

describe('loadAttempts', () => {
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

    graphqlDirect.mockResolvedValue({ contributeAttempts: null });
    expect(await loadAttempts()).toBeUndefined();
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

describe('the loaders, each operation settled on its own', () => {
  const notYet = () => Promise.reject(new Error('[{"message":"Cannot query field"}]'));

  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
  });

  it("merges each waiting reply's plan by id, and leaves it out when it is not answered", async () => {
    const waiting = { draftId: 'D_1', state: 'DRAFT', attemptId: 'A_F1' };
    const answering = (plan: () => Promise<unknown>) =>
      graphqlDirect.mockImplementation(async (document) => {
        if (document === ContributeRepliesWaitingDocument) return { contributeRepliesWaiting: [waiting] };
        if (document === ContributeRepliesWaitingPlanDocument) return plan();
        return notYet();
      });
    const held = { reason: 'no_answer', note: 'No answer.', at: '2026-10-28T11:00:00.000Z' };
    answering(async () => ({ contributeRepliesWaiting: [{ draftId: 'D_1', heldBack: held, waitsForProbe: false }] }));
    expect(await loadRepliesWaiting()).toEqual([{ ...waiting, heldBack: held, waitsForProbe: false }]);
    answering(() => notYet());
    expect(await loadRepliesWaiting()).toEqual([waiting]);
  });
});

describe('what the user works on', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
  });

  it('is not even asked when signed out', async () => {
    auth.mockResolvedValue(null);
    expect(await loadContributeSet()).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('is read as the signed-in user, whoever they are; null when hidden, undefined when not answered', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    graphqlDirect.mockResolvedValueOnce({ contributeSet: { mode: 'STACK' } });
    expect(await loadContributeSet()).toEqual({ mode: 'STACK' });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ contributeSet: null });
    expect(await loadContributeSet()).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502'));
    expect(await loadContributeSet()).toBeUndefined();
  });
});

describe('the Email rows', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
  });

  it('are not even asked for when signed out', async () => {
    auth.mockResolvedValue(null);
    expect(await loadContributeEmailSettings()).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('are read as the signed-in user: null when hidden, undefined when the read failed', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'octocat' }, expires: '2099-01-01' });
    const settings = { to: 'o•••@example.com', needsYou: 'ONCE_A_DAY', ended: true, timeZone: 'Europe/Warsaw' };
    graphqlDirect.mockResolvedValueOnce({ contributeEmailSettings: settings });
    expect(await loadContributeEmailSettings()).toEqual(settings);
    expect(graphqlDirect.mock.calls[0][0]).toBe(ContributeEmailSettingsDocument);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ contributeEmailSettings: null });
    expect(await loadContributeEmailSettings()).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502'));
    expect(await loadContributeEmailSettings()).toBeUndefined();
  });
});

describe('ownAgentOf', () => {
  const token = (id: string) => ({ id, name: id, last4: 'abcd', createdAt: '', lastUsedAt: null });

  it("takes each connection's kind and where its agent goes back from their own read, and says whether agents sign in", () => {
    const agent = ownAgentOf(
      {
        contributor: { paths: { hosted: false, mcp: true } },
        mcpTokens: [token('T_1'), { ...token('T_2'), last4: null }],
      },
      [{ id: 'T_2', kind: 'OAUTH', clientWhere: { kind: 'LOOPBACK', label: 'this computer' } }],
      true,
    );
    expect(agent?.tokens).toEqual([
      token('T_1'),
      { ...token('T_2'), last4: null, kind: 'OAUTH', clientWhere: { kind: 'LOOPBACK', label: 'this computer' } },
    ]);
    expect(agent?.signIn).toBe(true);
  });

  it('keeps the list as tokens when the kinds are not answered, and is undefined without a list', () => {
    expect(ownAgentOf({ contributor: null, mcpTokens: [token('T_1')] }, undefined)).toEqual({
      paths: { hosted: false, mcp: true },
      tokens: [token('T_1')],
      signIn: false,
    });
    expect(ownAgentOf(null)).toBeUndefined();
  });
});
