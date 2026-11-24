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

const { loadIssueNumbers, loadIssuePage, loadIssueStartReads, loadRulesLive, loadStartPageMask } = await import(
  './masked-issue.data'
);
const { fullPage, issueNumbers } = await import('./__fixtures__/masked-issue');
const { startViews } = await import('./start/__fixtures__/start-page');
const { mcpToken } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { print } = await import('graphql');

const nameOf = (document: unknown) => /(?:query|mutation) (\w+)/.exec(print(document as never))?.[1] ?? '';
const asked = () => graphqlDirect.mock.calls.map(([document]) => nameOf(document));

/** Answers each read by its operation's name; an Error is thrown. */
const answer = (answers: Record<string, unknown>) =>
  graphqlDirect.mockImplementation(async (document) => {
    const value = answers[nameOf(document)];
    if (value instanceof Error) throw value;
    return value;
  });

/** Today's API, which knows none of the new fields: what GraphQL answers a query for one of them. */
const todaysAnswerTo = (field: string, type = 'Query') =>
  new Error(JSON.stringify([{ message: `Cannot query field "${field}" on type "${type}".` }]));
const outage = () => new Error('fetch failed');

beforeEach(() => {
  graphqlDirect.mockReset();
  contribute.viewerLogin.mockResolvedValue('octocat');
  contribute.loadOwnAgent.mockResolvedValue(undefined);
});

describe('the page of one issue', () => {
  it('is read in an operation of its own, as the viewer, by its mask id', async () => {
    answer({ IssuePage: { issuePage: fullPage() } });
    expect(await loadIssuePage('q7k2m9xa')).toEqual({ kind: 'page', page: fullPage() });
    expect(asked()).toEqual(['IssuePage']);
    expect(graphqlDirect.mock.calls[0].slice(1)).toEqual([
      { id: 'q7k2m9xa' },
      { source: 'ssr', githubLogin: 'octocat' },
    ]);
  });

  it('is not found for an id no issue has, and for a viewer signed out (nothing asked)', async () => {
    answer({ IssuePage: { issuePage: null } });
    expect(await loadIssuePage('nothing')).toEqual({ kind: 'not-found' });
    contribute.viewerLogin.mockResolvedValueOnce(null);
    graphqlDirect.mockClear();
    expect(await loadIssuePage('q7k2m9xa')).toEqual({ kind: 'not-found' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("falls back to today's answer for the address, not found, when the API does not know the page yet", async () => {
    answer({ IssuePage: todaysAnswerTo('issuePage') });
    expect(await loadIssuePage('q7k2m9xa')).toEqual({ kind: 'not-found' });
  });

  it('is the outage the page says, never a 404, when the API does not answer', async () => {
    answer({ IssuePage: outage() });
    await expect(loadIssuePage('q7k2m9xa')).rejects.toBeInstanceOf(contribute.ContributeUnavailableError);
  });
});

describe('the numbers of a night', () => {
  it('are a public read of their own', async () => {
    answer({ IssueNumbers: { issueNumbers } });
    expect(await loadIssueNumbers()).toEqual(issueNumbers);
    expect(graphqlDirect.mock.calls[0][2]).not.toHaveProperty('githubLogin');
    expect(await loadRulesLive()).toBe(true);
  });

  it("fall back to none, and today's words, when the API does not know them or does not answer", async () => {
    answer({ IssueNumbers: todaysAnswerTo('issueNumbers') });
    expect(await loadIssueNumbers()).toBeNull();
    expect(await loadRulesLive()).toBe(false);
    answer({ IssueNumbers: outage() });
    expect(await loadRulesLive()).toBe(false);
    answer({ IssueNumbers: { issueNumbers: { ...issueNumbers, rulesLive: false } } });
    expect(await loadRulesLive()).toBe(false);
  });
});

describe("an old Start page address's mask", () => {
  const REF = { repo: 'driftwood-js/driftwood', issue: 934 };

  it('is read apart from the Start page, in its mode', async () => {
    answer({ StartPageMask: { startPageIssue: { masked: { id: 'q7k2m9xa' } } } });
    expect(await loadStartPageMask(REF, 'lesson')).toBe('q7k2m9xa');
    expect(asked()).toEqual(['StartPageMask']);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ repo: REF.repo, number: 934, mode: 'LEARN' });
  });

  it("is none when the viewer named or holds the issue, and falls back to none (today's page) with today's API", async () => {
    answer({ StartPageMask: { startPageIssue: { masked: null } } });
    expect(await loadStartPageMask(REF, 'fix')).toBeNull();
    // Today's answer: the Start page's issue as it is read now, which has no `masked`.
    answer({ StartPageMask: todaysAnswerTo('masked', 'StartPageIssue'), StartPageIssue: startViews.open.start });
    expect(await loadStartPageMask(REF, 'fix')).toBeNull();
    answer({ StartPageMask: outage() });
    expect(await loadStartPageMask(REF, 'fix')).toBeNull();
  });
});

describe("the start form's reads", () => {
  it('give the agent that called, its connect steps, and the pull requests that wait at the limit', async () => {
    const token = mcpToken({ name: 'Claude Code', lastUsedAt: '2026-10-28T11:00:00.000Z' });
    contribute.loadOwnAgent.mockResolvedValue({ paths: { hosted: false, mcp: true }, tokens: [token] });
    answer({
      ContributeOnboarding: { contribute: { contributor: { onboardedAt: '2026-10-01T00:00:00.000Z' } } },
      StartPageLimits: {
        contribute: {
          contributor: {
            settings: { attemptsAtATime: 2, openPrsAtATime: 3 },
            limits: null,
            scheduleCounts: { prBound: 3 },
          },
        },
      },
    });
    const reads = await loadIssueStartReads();
    expect(reads.connection?.client).toBe('claude-code');
    expect(reads.agent).toMatchObject({ onboarded: true, signIn: true, tokens: [token] });
    expect(reads.waitingPrs).toBe(3);
  });

  it('leave room to start when the limits cannot be read, and no agent when none called', async () => {
    answer({ ContributeOnboarding: outage(), StartPageLimits: outage() });
    const reads = await loadIssueStartReads();
    expect(reads.connection).toBeNull();
    expect(reads.waitingPrs).toBeNull();
  });
});
