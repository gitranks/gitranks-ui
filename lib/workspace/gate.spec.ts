import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const { sessionTokenOf } = vi.hoisted(() => ({ sessionTokenOf: vi.fn() }));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));

const { learnOpenFor, notEnteredTargetOf, requestLearnAccess, tabsOf, workspaceGateOf } = await import('./gate');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { isLearnIssuesPath, isLearnOpenPath, isLearnPath } = await import('@/lib/learn/learn-path');

describe('the Learn gate', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
  });

  it('is open when the API says Learn is open to the login, asked as that login', async () => {
    graphqlDirect.mockResolvedValue({ learnOpen: true });
    expect(await learnOpenFor('octocat')).toBe(true);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
  });

  it('is closed when the API says so', async () => {
    graphqlDirect.mockResolvedValue({ learnOpen: false });
    expect(await learnOpenFor('octocat')).toBe(false);
  });

  it('is closed without a login, without asking', async () => {
    for (const login of [null, undefined, '']) expect(await learnOpenFor(login)).toBe(false);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('is closed when the API does not know the field yet, or fails', async () => {
    graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'Cannot query field "learnOpen" on type "Query".' }])),
    );
    expect(await learnOpenFor('octocat')).toBe(false);
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await learnOpenFor('octocat')).toBe(false);
    graphqlDirect.mockResolvedValueOnce({ learnOpen: null });
    expect(await learnOpenFor('octocat')).toBe(false);
  });
});

describe("Learn's paths", () => {
  it('takes /learn and everything under it as Learn, in the spellings the router reads', () => {
    for (const path of [
      '/learn',
      '/learn/',
      '/LEARN/profile',
      '//learn//attempts/A_1',
      '/%6Cearn/lessons',
      '/learn%',
      '/learn/start/driftwood-js/driftwood/934',
      '/Learn//Start/acme/router/1',
    ]) {
      expect(isLearnPath(path), path).toBe(true);
    }
    for (const path of ['/', '/learning', '/learners', '/contribute/learn', '/profile/learn']) {
      expect(isLearnPath(path), path).toBe(false);
    }
  });

  it('opens a shared lesson, its result pages, the page for maintainers and the courses, nothing else', () => {
    for (const path of [
      '/learn/maintainers',
      '/learn/maintainers/',
      '/learn/lessons/route-cache-miss-8f3k',
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat',
      '/Learn//Lessons//x',
      // A person's public progress page (it answers 404 itself for a login with no public record).
      '/learn/progress/octocat',
      '/learn/progress/OctoCat/',
      // All courses and each course, with their Markdown copies, pictures and the pages of a gone one.
      '/learn/courses',
      '/learn/courses/',
      '/learn/courses.md',
      '/learn/courses/card.png',
      '/learn/courses/algorithms',
      '/learn/courses/algorithms/',
      '/learn/courses/algorithms.md',
      '/learn/courses/algorithms/card.png',
      '/learn/courses/_gone/algorithms',
      '/learn/courses/_missing',
    ]) {
      expect(isLearnOpenPath(path), path).toBe(true);
    }
    for (const path of [
      '/learn',
      '/learn/lessons',
      '/learn/lessons/',
      '/learn/lessons//',
      '/learn/profile',
      '/learn/attempts/A_1',
      '/learn/start/driftwood-js/driftwood/934',
      '/learn/maintainers/x',
      '/learn/maintainers%2F..%2Fprofile',
      '/learn/lessons/%E0%A4%A',
      '/learn/setup',
      '/learn/setup/',
      '/learn/progress',
      '/learn/progress/',
      '/learn/progress/octocat/x',
      '/learn/progress/octocat%2F..%2Fprofile',
      '/learn/coursesx',
      '/learn/courses.json',
      '/learn/courses//',
    ]) {
      expect(isLearnOpenPath(path), path).toBe(false);
    }
  });

  it('knows Issues and its views at a lesson and a course, in the spellings the router reads as them', () => {
    for (const path of [
      '/learn/issues',
      '/learn/issues/',
      '/Learn/Issues',
      '//learn//issues',
      '/learn/lessons/binary-search/real-world',
      '/learn/courses/algorithms/real-world/',
      '/learn/courses/algorithms/Real-World',
      '/learn/lessons/binary-search%2Freal-world',
    ]) {
      expect(isLearnIssuesPath(path), path).toBe(true);
    }
    for (const path of [
      '/learn',
      '/learn/issuesx',
      '/learn/issues/more',
      '/learn/lessons/binary-search',
      '/learn/lessons/real-world',
      '/learn/courses/algorithms/real-world/more',
      '/learn/start/issues',
    ]) {
      expect(isLearnIssuesPath(path), path).toBe(false);
    }
  });

  it("reads the request's session: open, closed, or signed out without a readable one", async () => {
    const req = { headers: new Headers() };
    sessionTokenOf.mockResolvedValueOnce(null);
    expect(await requestLearnAccess(req)).toBe('signed-out');
    sessionTokenOf.mockResolvedValueOnce({ githubLogin: 'octocat', error: 'RefreshTokenError' });
    expect(await requestLearnAccess(req)).toBe('signed-out');
    expect(graphqlDirect).not.toHaveBeenCalled();
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce({ learnOpen: true });
    expect(await requestLearnAccess(req)).toBe('open');
    graphqlDirect.mockResolvedValueOnce({ learnOpen: false });
    expect(await requestLearnAccess(req)).toBe('closed');
  });

  it('lets the request on (open) when the API does not answer in time: the page asks again', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat' });
    graphqlDirect.mockReturnValueOnce(new Promise(() => undefined));
    expect(await requestLearnAccess({ headers: new Headers() }, 10)).toBe('open');
  });
});

describe("the workspace gate, over today's answers", () => {
  const read = { githubLogin: 'octocat', access: 'allowed' as const, view: views.active, learnOpen: true };

  it('is signed out without a login, whatever else is known', () => {
    expect(workspaceGateOf({ ...read, githubLogin: null })).toEqual({ kind: 'signed-out' });
    expect(workspaceGateOf({ ...read, githubLogin: '' })).toEqual({ kind: 'signed-out' });
  });

  it("is hidden or setting up as Contribute's access says", () => {
    expect(workspaceGateOf({ ...read, access: 'hidden' })).toEqual({ kind: 'hidden' });
    expect(workspaceGateOf({ ...read, access: 'setting-up' })).toEqual({ kind: 'setting-up' });
  });

  it('is open with what the user has entered and connected', () => {
    expect(workspaceGateOf(read)).toEqual({
      kind: 'open',
      entered: true,
      agents: { hosted: true, own: false },
      learnOpen: true,
    });
    expect(workspaceGateOf({ ...read, view: views.agentOnboarded, learnOpen: false })).toEqual({
      kind: 'open',
      entered: true,
      agents: { hosted: false, own: true },
      learnOpen: false,
    });
    // Entered once, and everything revoked since: still entered, nothing connected.
    expect(workspaceGateOf({ ...read, view: views.onboardedNoPath })).toMatchObject({
      entered: true,
      agents: { hosted: false, own: false },
    });
    expect(workspaceGateOf({ ...read, view: views.midSetup })).toMatchObject({ entered: false });
    expect(workspaceGateOf({ ...read, view: null })).toMatchObject({ entered: false });
  });

  it('shows the tabs once entered, Learn only where it is open', () => {
    expect(tabsOf(workspaceGateOf(read))).toEqual(['contribute', 'learn', 'pull-requests', 'agent', 'settings']);
    expect(tabsOf(workspaceGateOf({ ...read, learnOpen: false }))).toEqual([
      'contribute',
      'pull-requests',
      'agent',
      'settings',
    ]);
    expect(tabsOf(workspaceGateOf({ ...read, view: views.midSetup }))).toEqual([]);
    expect(tabsOf({ kind: 'signed-out' })).toEqual([]);
    expect(tabsOf({ kind: 'hidden' })).toEqual([]);
    expect(tabsOf({ kind: 'setting-up' })).toEqual([]);
  });
});

describe('where an account that has not entered goes from a page under /my', () => {
  it('opens the Agent and Settings pages, as someone mid-setup may need them', () => {
    for (const path of ['/my/agent', '/my/agent/', '/my/agent/key', '/my/agent/runs', '/my/settings/work']) {
      expect(notEnteredTargetOf(path), path).toBeNull();
    }
  });

  it('sends the agent’s connect page to the own-agent step of Contribute’s flow, the query kept', () => {
    expect(notEnteredTargetOf('/my/agent/connect')).toBe('/contribute/start/agent/own');
    expect(notEnteredTargetOf('/my/agent/connect/', new URLSearchParams('from=agent'))).toBe(
      '/contribute/start/agent/own?from=agent',
    );
  });

  it('sends a Start page in Fix mode to the flow’s first step', () => {
    expect(notEnteredTargetOf('/my/start/acme/widgets/42')).toBe('/contribute/start');
    expect(notEnteredTargetOf('/my/start/acme/widgets/42', new URLSearchParams('from=contribute'))).toBe(
      '/contribute/start',
    );
  });

  it("sends a lesson's Start page to Learn's step for the issue", () => {
    expect(notEnteredTargetOf('/my/start/acme/widgets/42', new URLSearchParams('lesson=1'))).toBe(
      '/learn/start/acme/widgets/42',
    );
    expect(notEnteredTargetOf('/my/start/acme/widgets/42/', new URLSearchParams('lesson=1&from=contribute'))).toBe(
      '/learn/start/acme/widgets/42',
    );
  });

  it("sends every other page to Contribute's home", () => {
    for (const path of ['/my/pull-requests', '/my/pull-requests/acme/widgets/42', '/my']) {
      expect(notEnteredTargetOf(path), path).toBe('/contribute');
    }
  });

  it('decides nothing outside /my', () => {
    for (const path of ['/contribute', '/learn', '/my-agent', '/myself'])
      expect(notEnteredTargetOf(path), path).toBeNull();
  });
});
