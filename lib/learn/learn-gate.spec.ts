import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { learnOpenFor } = await import('./learn-gate');
const { isLearnOpenPath, isLearnPath, learnAttemptPath } = await import('./learn-path');

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
});
