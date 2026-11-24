import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const contribute = vi.hoisted(() => ({
  viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
  loadOwnAgent: vi.fn(async (): Promise<unknown> => undefined),
  ContributeUnavailableError: class ContributeUnavailableError extends Error {},
}));
vi.mock('@/lib/workspace/contribute.data', () => contribute);
vi.mock('@/lib/workspace/mcp-sign-in', () => ({ contributeMcpSignIn: vi.fn(async () => true) }));

const { loadStartPageView, startPageAttemptOf, startPageOnboarded, startPageViewOf } = await import(
  './start-page.data'
);
const { fixAttemptOf, startViews } = await import('./__fixtures__/start-page');
const { mcpToken } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { print } = await import('graphql');

const READER = { source: 'ssr' as const, githubLogin: 'octocat' };
const REPO = 'driftwood-js/driftwood';
const asked = () => graphqlDirect.mock.calls.map(([document]) => /query (\w+)/.exec(print(document))?.[1]);
const schemaError = () =>
  new Error(JSON.stringify([{ message: 'Cannot query field "startPageIssue" on type "Query".' }]));
const NO_LIMITS = { openPrs: null, attempts: null };

/** Answers each read by its operation's name. */
const answer = (answers: Record<string, unknown>) =>
  graphqlDirect.mockImplementation(async (document) => {
    const name = /query (\w+)/.exec(print(document))?.[1] ?? '';
    const value = answers[name];
    if (value instanceof Error) throw value;
    return value;
  });

describe("the Start page's reads", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
  });

  it('asks the issue in the mode, as the viewer, and nothing more without a refusal that needs it', async () => {
    graphqlDirect.mockResolvedValueOnce({ startPageIssue: startViews.open.start });
    expect(await startPageViewOf(READER, REPO, 934, 'fix')).toEqual({ ok: true, data: startViews.open });
    expect(asked()).toEqual(['StartPageIssue']);
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([{ repo: REPO, number: 934, mode: 'FIX' }, READER]);

    graphqlDirect.mockResolvedValueOnce({ startPageIssue: startViews.open.start });
    await startPageViewOf(READER, REPO, 934, 'lesson');
    expect(graphqlDirect.mock.calls[1][1]).toEqual({ repo: REPO, number: 934, mode: 'LEARN' });
  });

  it('reads the lesson in progress for OWN_IN_PROGRESS, and leaves it null when that read fails', async () => {
    const current = startViews.ownInProgress.current;
    answer({
      StartPageIssue: { startPageIssue: startViews.ownInProgress.start },
      StartPageCurrent: { myLearnAttempts: { current } },
    });
    expect(await startPageViewOf(READER, REPO, 934, 'lesson')).toEqual({
      ok: true,
      data: { start: startViews.ownInProgress.start, current, limits: NO_LIMITS },
    });
    expect(asked()).toEqual(['StartPageIssue', 'StartPageCurrent']);

    answer({ StartPageIssue: { startPageIssue: startViews.ownInProgress.start }, StartPageCurrent: new Error('down') });
    expect(await startPageViewOf(READER, REPO, 934, 'lesson')).toMatchObject({ ok: true, data: { current: null } });
  });

  it('reads the limits for LIMIT_REACHED alone: what holds, and what the open pull request limit counts', async () => {
    const contributor = (patch: Record<string, unknown> = {}) => ({
      contribute: {
        contributor: {
          settings: { attemptsAtATime: 3, openPrsAtATime: 5 },
          limits: {
            level: 'STANDARD',
            reason: null,
            attemptsAtATime: 10,
            openPrsAtATime: 10,
            openPrsEffective: 4,
            openPrsOverride: null,
            claimsPerDay: 10,
          },
          scheduleCounts: { prBound: 4 },
          ...patch,
        },
      },
    });
    answer({ StartPageIssue: { startPageIssue: startViews.limitPrs.start }, StartPageLimits: contributor() });
    expect(await startPageViewOf(READER, REPO, 934, 'fix')).toMatchObject({
      data: { limits: { openPrs: { count: 4, limit: 4 }, attempts: 3 } },
    });
    expect(asked()).toEqual(['StartPageIssue', 'StartPageLimits']);

    // A limit set for the account holds over the open pull request setting.
    graphqlDirect.mockReset();
    answer({
      StartPageIssue: { startPageIssue: startViews.limitAttempts.start },
      StartPageLimits: contributor({
        limits: {
          level: 'STANDARD',
          reason: null,
          attemptsAtATime: 10,
          openPrsAtATime: 10,
          openPrsEffective: 2,
          openPrsOverride: 2,
          claimsPerDay: 10,
        },
        scheduleCounts: null,
      }),
    });
    expect(await startPageViewOf(READER, REPO, 934, 'fix')).toMatchObject({
      data: { limits: { openPrs: { count: 2, limit: 2 }, attempts: 3 } },
    });

    graphqlDirect.mockReset();
    answer({ StartPageIssue: { startPageIssue: startViews.limitPrs.start }, StartPageLimits: new Error('down') });
    expect(await startPageViewOf(READER, REPO, 934, 'fix')).toMatchObject({ data: { limits: NO_LIMITS } });

    graphqlDirect.mockReset();
    answer({ StartPageIssue: { startPageIssue: startViews.taken.start } });
    expect(await startPageViewOf(READER, REPO, 934, 'fix')).toMatchObject({ data: { limits: NO_LIMITS } });
    expect(asked()).toEqual(['StartPageIssue']);
  });

  it('asks nothing again for an answer read already, and passes on its error', async () => {
    expect(await startPageViewOf(READER, REPO, 934, 'fix', { ok: true, data: startViews.open.start })).toEqual({
      ok: true,
      data: startViews.open,
    });
    expect(await startPageViewOf(READER, REPO, 934, 'fix', { ok: false, error: 'NOT_FOUND' })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers a failed ask with its error', async () => {
    graphqlDirect.mockRejectedValueOnce(schemaError());
    expect(await startPageViewOf(READER, REPO, 934, 'fix')).toEqual({ ok: false, error: 'NOT_AVAILABLE_YET' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await startPageAttemptOf(READER, REPO, 934)).toEqual({ ok: false, error: 'FAILED' });
  });

  it("answers the viewer's live attempt, any mode, or null", async () => {
    graphqlDirect.mockResolvedValueOnce({ startPageAttempt: fixAttemptOf('RUNNING') });
    expect(await startPageAttemptOf(READER, REPO, 934)).toEqual({ ok: true, data: fixAttemptOf('RUNNING') });
    expect(asked()).toEqual(['StartPageAttempt']);
    graphqlDirect.mockResolvedValueOnce({ startPageAttempt: null });
    expect(await startPageAttemptOf(READER, REPO, 934)).toEqual({ ok: true, data: null });
  });

  it('takes a viewer as onboarded unless the API says they are not', async () => {
    graphqlDirect.mockResolvedValueOnce({ contribute: { contributor: { onboardedAt: null, onboardedVia: null } } });
    expect(await startPageOnboarded(READER)).toBe(false);
    graphqlDirect.mockResolvedValueOnce({
      contribute: { contributor: { onboardedAt: '2026-10-01T00:00:00.000Z', onboardedVia: 'MCP' } },
    });
    expect(await startPageOnboarded(READER)).toBe(true);
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await startPageOnboarded(READER)).toBe(true);
  });
});

describe("the Start page's load", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    contribute.viewerLogin.mockResolvedValue('octocat');
    contribute.loadOwnAgent.mockResolvedValue({ paths: { hosted: false, mcp: true }, tokens: [mcpToken()] });
  });
  const ref = { repo: REPO, issue: 934 };
  const onboarded = { contribute: { contributor: { onboardedAt: '2026-10-01T00:00:00.000Z', onboardedVia: 'MCP' } } };

  it('reads the view: the issue and the agent, the restart sentence from the same connections, in lesson mode alone', async () => {
    answer({ StartPageIssue: { startPageIssue: startViews.open.start }, ContributeOnboarding: onboarded });
    const stale = mcpToken({ lastUsedAt: new Date().toISOString(), learnListed: false });
    contribute.loadOwnAgent.mockResolvedValue({ paths: { hosted: false, mcp: true }, tokens: [stale] });
    const fix = await loadStartPageView(ref, 'fix');
    expect(fix).toMatchObject({
      kind: 'view',
      view: { issue: startViews.open, agent: { onboarded: true, signIn: true }, restartHint: false },
    });
    const lesson = await loadStartPageView(ref, 'lesson');
    expect(lesson).toMatchObject({ kind: 'view', view: { restartHint: true } });
    // One read of the connections: the agent's own.
    expect(asked()).toEqual(['StartPageIssue', 'ContributeOnboarding', 'StartPageIssue', 'ContributeOnboarding']);
  });

  it("moves on to the viewer's own attempt, but words a Fix attempt in lesson mode", async () => {
    answer({ StartPageIssue: { startPageIssue: startViews.yoursFix.start }, ContributeOnboarding: onboarded });
    expect(await loadStartPageView(ref, 'fix')).toEqual({
      kind: 'claimed',
      href: '/my/pull-requests/driftwood-js/driftwood/934',
    });
    answer({ StartPageIssue: { startPageIssue: startViews.yoursFix.start }, ContributeOnboarding: onboarded });
    expect(await loadStartPageView(ref, 'lesson')).toMatchObject({ kind: 'view' });

    answer({ StartPageIssue: { startPageIssue: startViews.yoursLesson.start }, ContributeOnboarding: onboarded });
    expect(await loadStartPageView(ref, 'fix')).toEqual({
      kind: 'claimed',
      href: '/my/pull-requests/driftwood-js/driftwood/934',
    });
  });

  it('is no page signed out or closed in the mode, an unavailable issue for one it would not take, and throws on an outage', async () => {
    contribute.viewerLogin.mockResolvedValueOnce(null);
    expect(await loadStartPageView(ref, 'fix')).toEqual({ kind: 'not-found' });

    answer({
      StartPageIssue: new Error(JSON.stringify([{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }])),
      ContributeOnboarding: onboarded,
    });
    expect(await loadStartPageView(ref, 'fix')).toEqual({ kind: 'not-found' });

    answer({
      StartPageIssue: new Error(JSON.stringify([{ message: 'Bad', extensions: { code: 'BAD_USER_INPUT' } }])),
      ContributeOnboarding: onboarded,
    });
    expect(await loadStartPageView(ref, 'fix')).toMatchObject({
      kind: 'view',
      view: { issue: { start: { refusal: 'UNAVAILABLE', issue: null } } },
    });

    answer({ StartPageIssue: new Error('down'), ContributeOnboarding: onboarded });
    await expect(loadStartPageView(ref, 'fix')).rejects.toBeInstanceOf(contribute.ContributeUnavailableError);
  });
});
