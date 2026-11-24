import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlDirect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { fixGateOf, fixRouteGateOf } = await import('./fix-gate');

const pr = { nameWithOwner: 'acme/widgets', number: 57 };
const walkthrough = { pr, login: null };
const answers = { pr, login: 'octocat' };
const live = { state: 'LIVE', owner: 'acme', repo: 'widgets', number: 57, login: 'octocat' } as const;

beforeEach(() => {
  graphqlDirect.mockReset();
});

describe('fixGateOf', () => {
  it('goes on to the page for a live address, private answers, and a read it cannot use', () => {
    expect(fixGateOf(walkthrough, live)).toEqual({ kind: 'page' });
    expect(fixGateOf(answers, { ...live, state: 'PRIVATE' })).toEqual({ kind: 'page' });
    expect(fixGateOf(walkthrough, null)).toEqual({ kind: 'page' });
    expect(fixGateOf(walkthrough, { ...live, owner: null })).toEqual({ kind: 'page' });
  });

  it('answers nothing there, and a removed fix with its own page', () => {
    expect(fixGateOf(walkthrough, { ...live, state: 'MISSING' })).toEqual({ kind: 'missing' });
    expect(fixGateOf(answers, { ...live, state: 'REMOVED' })).toEqual({
      kind: 'removed',
      path: '/learn/fixes/_removed/acme/widgets/57',
    });
  });

  it("moves another spelling to the API's: a renamed repository, a login's letter case", () => {
    expect(fixGateOf(walkthrough, { ...live, repo: 'gadgets' })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/gadgets/57/walkthrough',
    });
    expect(fixGateOf(answers, { ...live, login: 'Octocat' })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57/walkthrough/by/Octocat',
    });
  });
});

describe('fixRouteGateOf', () => {
  it('asks the API with the pull request and the login, signed out', async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: { ...live, state: 'MISSING' } });
    expect(await fixRouteGateOf(answers)).toEqual({ kind: 'missing' });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({
      ref: { owner: 'acme', repo: 'widgets', number: 57 },
      login: 'octocat',
    });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
  });

  it('leaves a failed or slow ask to the page', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await fixRouteGateOf(walkthrough)).toEqual({ kind: 'page' });
    graphqlDirect.mockReturnValue(new Promise(() => {}));
    expect(await fixRouteGateOf(walkthrough, 5)).toEqual({ kind: 'page' });
  });
});
