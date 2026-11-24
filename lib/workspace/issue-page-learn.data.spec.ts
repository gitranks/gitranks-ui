import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const contribute = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => contribute);

const { loadIssuePageLearn } = await import('./issue-page-learn.data');
const { print } = await import('graphql');

const PARTS = {
  lesson: { slug: 'a-queue', title: 'A queue: first in, first out' },
  why: 'TEACHES_NEW',
  learnOnly: false,
  started: null,
};

beforeEach(() => {
  graphqlDirect.mockReset();
  contribute.viewerLogin.mockResolvedValue('octocat');
});

describe("Learn's parts of the page of one issue", () => {
  it('are read in an operation of their own, as the viewer, by the mask id, asking only their own fields', async () => {
    graphqlDirect.mockResolvedValue({ issuePage: PARTS });
    expect(await loadIssuePageLearn('q7k2m9xa')).toEqual(PARTS);
    const [document, variables, options] = graphqlDirect.mock.calls[0];
    const query = print(document);
    expect(query).toMatch(/query IssuePageLearn\b/);
    expect(query).not.toMatch(/\b(?:masked|full|state|looks|until)\b/);
    expect(variables).toEqual({ id: 'q7k2m9xa' });
    expect(options).toEqual({ source: 'ssr', githubLogin: 'octocat', signal: expect.any(AbortSignal) });
  });

  it('are none signed out (nothing asked), for an id no issue has, and when the read fails', async () => {
    contribute.viewerLogin.mockResolvedValueOnce(null);
    expect(await loadIssuePageLearn('q7k2m9xa')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockResolvedValueOnce({ issuePage: null });
    expect(await loadIssuePageLearn('q7k2m9xa')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "learnOnly" on type "IssuePage".'));
    expect(await loadIssuePageLearn('q7k2m9xa')).toBeNull();
  });
});
