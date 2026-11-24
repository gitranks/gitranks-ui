import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const contribute = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => contribute);

const { loadIssuePageKept } = await import('./issue-page-kept.data');
const { readIssueKept } = await import('./issue-page-kept.actions');
const { print } = await import('graphql');

beforeEach(() => {
  graphqlDirect.mockReset();
  contribute.viewerLogin.mockResolvedValue('octocat');
});

describe('whether the issue is kept for learners, on the page of one issue', () => {
  it('is read in an operation of its own, as the viewer, by the mask id, asking only its own field', async () => {
    graphqlDirect.mockResolvedValue({ issuePage: { keptForLearners: { until: '2026-10-28T14:30:00.000Z' } } });
    expect(await loadIssuePageKept('q7k2m9xa')).toEqual({ until: '2026-10-28T14:30:00.000Z' });
    const [document, variables, options] = graphqlDirect.mock.calls[0];
    const query = print(document);
    expect(query).toMatch(/query IssuePageKept\b/);
    expect(query.replace(/\s+/g, ' ')).toBe(
      'query IssuePageKept($id: ID!) { issuePage(id: $id) { keptForLearners { until } } }',
    );
    expect(variables).toEqual({ id: 'q7k2m9xa' });
    expect(options).toEqual({ source: 'ssr', githubLogin: 'octocat', signal: expect.any(AbortSignal) });
  });

  it('is none when not kept, signed out (nothing asked), for an id no issue has, and when the read fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ issuePage: { keptForLearners: null } });
    expect(await loadIssuePageKept('q7k2m9xa')).toBeNull();
    contribute.viewerLogin.mockResolvedValueOnce(null);
    expect(await loadIssuePageKept('q7k2m9xa')).toBeNull();
    expect(graphqlDirect).toHaveBeenCalledOnce();
    graphqlDirect.mockResolvedValueOnce({ issuePage: null });
    expect(await loadIssuePageKept('q7k2m9xa')).toBeNull();
    // What an API that does not answer the field yet says.
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "keptForLearners" on type "IssuePage".'));
    expect(await loadIssuePageKept('q7k2m9xa')).toBeNull();
  });

  it('is read again after a refused press, as the session user, only for a mask id', async () => {
    graphqlDirect.mockResolvedValue({ issuePage: { keptForLearners: { until: null } } });
    expect(await readIssueKept('q7k2m9xa')).toEqual({ until: null });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({
      source: 'client',
      githubLogin: 'octocat',
      signal: expect.any(AbortSignal),
    });
    expect(await readIssueKept('../x')).toBeNull();
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });
});
