import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const { sessionTokenOf } = vi.hoisted(() => ({ sessionTokenOf: vi.fn() }));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));

const { learnOpenFor, requestLearnAccess, tabsOf, workspaceGateOf } = await import('./gate');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { isLearnOpenPath, isLearnPath } = await import('@/lib/learn/learn-path');
const { learnAttemptPath } = await import('./paths');

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

  it('opens a shared lesson, its result pages and the page for maintainers, nothing else', () => {
    for (const path of [
      '/learn/maintainers',
      '/learn/maintainers/',
      '/learn/lessons/route-cache-miss-8f3k',
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat',
      '/Learn//Lessons//x',
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
    ]) {
      expect(isLearnOpenPath(path), path).toBe(false);
    }
  });

  it("writes an attempt's page with its id encoded", () => {
    expect(learnAttemptPath('A_1')).toBe('/learn/attempts/A_1');
    expect(learnAttemptPath('a/b')).toBe('/learn/attempts/a%2Fb');
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
