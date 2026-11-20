import { afterEach, describe, expect, it, vi } from 'vitest';

const graphql = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => graphql);

const { progressGateOf } = await import('./progress-gate');
const { isLearnOpenPath, publicProgressPath, publicProgressRouteOf } = await import('../learn-path');

const record = { login: 'OctoCat', lessons: 2, newThings: 1, topics: [], prsOpened: 1, prsMerged: 0, reposHelped: 0 };

afterEach(() => {
  vi.clearAllMocks();
});

describe('the public progress page’s address', () => {
  it('is open to everyone and names one login', () => {
    expect(publicProgressPath('OctoCat')).toBe('/learn/progress/OctoCat');
    expect(publicProgressPath('OctoCat', 3)).toBe('/learn/progress/OctoCat?page=3');
    expect(isLearnOpenPath('/learn/progress/OctoCat')).toBe(true);
    expect(publicProgressRouteOf('/learn/progress/OctoCat')).toBe('OctoCat');
    expect(publicProgressRouteOf('/learn/progress/OctoCat/')).toBe('OctoCat');
    for (const path of ['/learn/progress', '/learn/progress/a/b', '/learn/progress/-x', '/learn/lessons/a']) {
      expect(publicProgressRouteOf(path), path).toBeNull();
    }
  });
});

describe('the public progress page’s gate', () => {
  it('lets the stored spelling of a login with a record through, asked anonymously', async () => {
    graphql.graphqlDirect.mockResolvedValue({ learnRecord: record });
    expect(await progressGateOf('OctoCat')).toBe('page');
    expect(graphql.graphqlDirect.mock.calls[0][1]).toEqual({ login: 'OctoCat' });
    expect(graphql.graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
  });

  it('answers 404 without a record and for another spelling', async () => {
    graphql.graphqlDirect.mockResolvedValue({ learnRecord: null });
    expect(await progressGateOf('octocat')).toBe('missing');
    graphql.graphqlDirect.mockResolvedValue({ learnRecord: record });
    expect(await progressGateOf('octocat')).toBe('missing');
  });

  it('leaves a failed or slow ask to the page', async () => {
    graphql.graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await progressGateOf('OctoCat')).toBe('page');
    graphql.graphqlDirect.mockImplementation(() => new Promise(() => undefined));
    expect(await progressGateOf('OctoCat', 5)).toBe('page');
  });
});
