import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, currentMaintainerToken } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  currentMaintainerToken: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('./maintainer-token', () => ({ currentMaintainerToken }));

const { loadMaintainerRepos } = await import('./maintainers.data');

const TOKEN = 'gho_maintainerPageToken123';
const REPOS = {
  login: 'octocat',
  truncated: false,
  repos: [
    {
      repoId: 'R_1',
      nameWithOwner: 'octocat/hello',
      permission: 'ADMIN',
      stars: 1200,
      isArchived: false,
      optedOut: false,
      optedOutAt: null,
    },
  ],
};

const answer = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

/** The body the API was sent. */
const sent = () => JSON.parse(signedFetch.mock.calls[0][1].body as string) as { query: string; variables: object };

describe('loadMaintainerRepos', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    currentMaintainerToken.mockReset();
    currentMaintainerToken.mockResolvedValue(TOKEN);
  });

  it('asks nothing without the page sign-in', async () => {
    currentMaintainerToken.mockResolvedValueOnce(null);

    expect(await loadMaintainerRepos()).toEqual({ state: 'signed-out' });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('sends the token as a variable, never in the query, as no signed-in user, and gives it back nowhere', async () => {
    answer(200, { data: { maintainerRepos: REPOS } });

    const view = await loadMaintainerRepos();

    expect(view).toEqual({ state: 'listed', data: REPOS });
    expect(JSON.stringify(view)).not.toContain(TOKEN);
    const { query, variables } = sent();
    expect(variables).toEqual({ token: TOKEN });
    expect(query).not.toContain(TOKEN);
    expect(query).toContain('maintainerRepos(token: $token)');
    expect(signedFetch.mock.calls[0][2]).toBe('ssr');
    expect(signedFetch.mock.calls[0][3]).toBeUndefined();
  });

  it.each([
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['INTERNAL_SERVER_ERROR', 'FAILED'],
  ])('tells %s as %s, without its words', async (code, error) => {
    answer(200, { data: null, errors: [{ message: `GitHub refused ${TOKEN}`, extensions: { code } }] });

    const view = await loadMaintainerRepos();

    expect(view).toEqual({ state: 'failed', error });
    expect(JSON.stringify(view)).not.toContain(TOKEN);
  });

  it('tells an API that does not know the field yet, and an outage', async () => {
    answer(400, { errors: [{ message: 'Cannot query field "maintainerRepos" on type "Query".' }] });
    expect(await loadMaintainerRepos()).toEqual({ state: 'failed', error: 'NOT_AVAILABLE_YET' });

    signedFetch.mockResolvedValueOnce(new Response('', { status: 502, statusText: 'Bad Gateway' }));
    expect(await loadMaintainerRepos()).toEqual({ state: 'failed', error: 'FAILED' });
  });
});
