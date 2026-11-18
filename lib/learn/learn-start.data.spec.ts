import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { learnStartAttemptOf, learnStartOnboarded, learnStartViewOf } = await import('./learn-start.data');
const { startViews } = await import('./__fixtures__/learn-start');
const { print } = await import('graphql');

const READER = { source: 'ssr' as const, githubLogin: 'octocat' };
const asked = () => graphqlDirect.mock.calls.map(([document]) => /query (\w+)/.exec(print(document))?.[1]);
const schemaError = () =>
  new Error(JSON.stringify([{ message: 'Cannot query field "learnStartIssue" on type "Query".' }]));

describe("the start page's reads", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
  });

  it('asks the issue as the viewer, and nothing more without a refusal that needs it', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnStartIssue: startViews.open.start });
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toEqual({ ok: true, data: startViews.open });
    expect(asked()).toEqual(['LearnStartIssue']);
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([{ repo: 'driftwood-js/driftwood', number: 934 }, READER]);
  });

  it('reads the lesson in progress for OWN_IN_PROGRESS, and leaves it null when that read fails', async () => {
    const current = startViews.ownInProgress.current;
    graphqlDirect
      .mockResolvedValueOnce({ learnStartIssue: startViews.ownInProgress.start })
      .mockResolvedValueOnce({ myLearnAttempts: { current } });
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toEqual({
      ok: true,
      data: { start: startViews.ownInProgress.start, current, openPrs: null },
    });
    expect(asked()).toEqual(['LearnStartIssue', 'LearnStartCurrent']);

    graphqlDirect
      .mockResolvedValueOnce({ learnStartIssue: startViews.ownInProgress.start })
      .mockRejectedValueOnce(new Error('down'));
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toMatchObject({
      ok: true,
      data: { current: null },
    });
  });

  it('counts the open pull requests for LIMIT_REACHED on them alone', async () => {
    graphqlDirect
      .mockResolvedValueOnce({ learnStartIssue: startViews.limitPrs.start })
      .mockResolvedValueOnce({ learnIssues: { room: { limit: 'open_prs_at_a_time', value: 3 } } });
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toMatchObject({
      ok: true,
      data: { openPrs: 3 },
    });
    expect(asked()).toEqual(['LearnStartIssue', 'LearnStartRoom']);

    graphqlDirect.mockReset();
    graphqlDirect
      .mockResolvedValueOnce({ learnStartIssue: startViews.limitPrs.start })
      .mockResolvedValueOnce({ learnIssues: { room: null } });
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toMatchObject({ data: { openPrs: null } });

    graphqlDirect.mockReset();
    graphqlDirect.mockResolvedValueOnce({ learnStartIssue: startViews.limitAttempts.start });
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toMatchObject({ data: { openPrs: null } });
    expect(asked()).toEqual(['LearnStartIssue']);
  });

  it('answers a failed ask with its error', async () => {
    graphqlDirect.mockRejectedValueOnce(schemaError());
    expect(await learnStartViewOf(READER, 'driftwood-js/driftwood', 934)).toEqual({
      ok: false,
      error: 'NOT_AVAILABLE_YET',
    });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await learnStartAttemptOf(READER, 'driftwood-js/driftwood', 934)).toEqual({ ok: false, error: 'FAILED' });
  });

  it("answers the viewer's live attempt, or null", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnStartAttempt: { id: 'A_9', mode: 'FIX', state: 'RUNNING' } });
    expect(await learnStartAttemptOf(READER, 'driftwood-js/driftwood', 934)).toEqual({
      ok: true,
      data: { id: 'A_9', mode: 'FIX', state: 'RUNNING' },
    });
    graphqlDirect.mockResolvedValueOnce({ learnStartAttempt: null });
    expect(await learnStartAttemptOf(READER, 'driftwood-js/driftwood', 934)).toEqual({ ok: true, data: null });
  });

  it('takes a viewer as onboarded unless the API says they are not', async () => {
    graphqlDirect.mockResolvedValueOnce({ contribute: { contributor: { onboardedAt: null, onboardedVia: null } } });
    expect(await learnStartOnboarded(READER)).toBe(false);
    graphqlDirect.mockResolvedValueOnce({
      contribute: { contributor: { onboardedAt: '2026-10-01T00:00:00.000Z', onboardedVia: 'MCP' } },
    });
    expect(await learnStartOnboarded(READER)).toBe(true);
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await learnStartOnboarded(READER)).toBe(true);
  });
});
