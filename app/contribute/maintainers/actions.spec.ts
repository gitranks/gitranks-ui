import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, currentSessionToken, signIn, jar } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  currentSessionToken: vi.fn(),
  signIn: vi.fn(),
  jar: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('@/lib/contribute/session-token', () => ({ currentSessionToken }));
vi.mock('next/headers', () => ({ cookies: async () => jar }));
vi.mock('@/auth', () => ({ signIn }));

const actions = await import('./actions');
const { maintainerSignInCookie } = await import('@/lib/contribute/maintainer-token');

const TOKEN = 'gho_maintainerPageToken123';
const session = (patch: Record<string, unknown> = {}) => ({
  sub: 'user-1',
  githubLogin: 'octocat',
  maintainerToken: TOKEN,
  maintainerTokenExpiresAt: Date.now() + 60_000,
  ...patch,
});

const result = (repoId: string, patch: Record<string, unknown> = {}) => ({
  repoId,
  nameWithOwner: `octocat/${repoId}`,
  optedOut: true,
  optedOutAt: '2026-10-29T10:00:00.000Z',
  reason: null,
  ...patch,
});

/** Answers each call with one result per repository it asked about. */
const answerEach = (field: 'optOutRepos' | 'optInRepos') =>
  signedFetch.mockImplementation(async (_path: string, init: RequestInit) => {
    const { variables } = JSON.parse(init.body as string) as { variables: { repoIds: string[] } };
    return Response.json({ data: { [field]: variables.repoIds.map((id) => result(id)) } });
  });

const bodies = () =>
  signedFetch.mock.calls.map(
    ([, init]) => JSON.parse((init as RequestInit).body as string) as { query: string; variables: object },
  );

describe('the maintainers page actions', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    currentSessionToken.mockReset();
    currentSessionToken.mockResolvedValue(session());
    signIn.mockReset();
    jar.set.mockReset();
  });

  it.each([
    ['optOutMaintainerRepos', 'optOutRepos'],
    ['optInMaintainerRepos', 'optInRepos'],
  ] as const)('%s sends the token as a variable only, and never returns it', async (name, field) => {
    answerEach(field);

    const answer = await actions[name](['R_1', 'R_2']);

    expect(answer).toEqual({ ok: true, data: [result('R_1'), result('R_2')] });
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
    const [{ query, variables }] = bodies();
    expect(variables).toEqual({ token: TOKEN, repoIds: ['R_1', 'R_2'] });
    expect(query).not.toContain(TOKEN);
    expect(query).toContain(`${field}(token: $token, repoIds: $repoIds)`);
    // No signed-in gitranks user is needed or sent: the token is the proof.
    expect(signedFetch.mock.calls[0][3]).toBeUndefined();
  });

  it.each([
    ['without the page sign-in', session({ maintainerToken: undefined })],
    ['once its token has run out', session({ maintainerTokenExpiresAt: Date.now() - 1 })],
    ['without a session', null],
  ])('asks nothing %s', async (_, token) => {
    currentSessionToken.mockResolvedValue(token);

    expect(await actions.optOutMaintainerRepos(['R_1'])).toEqual({ ok: false, error: 'SIGNED_OUT', data: [] });
    expect(await actions.optInMaintainerRepos(['R_1'])).toEqual({ ok: false, error: 'SIGNED_OUT', data: [] });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('sends each id once, drops malformed ones, and asks in turns of 100', async () => {
    answerEach('optOutRepos');
    const ids = Array.from({ length: 250 }, (_, index) => `R_${index}`);

    const answer = await actions.optOutMaintainerRepos([...ids, 'R_0', '', 'R 1', 7 as never, 'x'.repeat(101)]);

    expect(answer.ok).toBe(true);
    expect(answer.data).toHaveLength(250);
    expect(bodies().map(({ variables }) => (variables as { repoIds: string[] }).repoIds.length)).toEqual([
      100, 100, 50,
    ]);
  });

  it('asks nothing for an empty choice', async () => {
    expect(await actions.optOutMaintainerRepos([])).toEqual({ ok: true, data: [] });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('passes on refusals as the API gives them', async () => {
    const refused = [
      result('R_1', { reason: 'NOT_MAINTAINER', optedOut: false, optedOutAt: null }),
      result('R_2', { nameWithOwner: null, reason: 'UNKNOWN_REPO', optedOut: false, optedOutAt: null }),
    ];
    signedFetch.mockResolvedValueOnce(Response.json({ data: { optOutRepos: refused } }));

    expect(await actions.optOutMaintainerRepos(['R_1', 'R_2'])).toEqual({ ok: true, data: refused });
  });

  it.each([
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['BAD_USER_INPUT', 'FAILED'],
  ])('tells %s as %s, never in the words of the answer', async (code, error) => {
    signedFetch.mockResolvedValueOnce(
      Response.json({ data: null, errors: [{ message: `refused ${TOKEN}`, extensions: { code } }] }),
    );

    const answer = await actions.optOutMaintainerRepos(['R_1']);

    expect(answer).toEqual({ ok: false, error, data: [] });
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
  });

  it('keeps the turns that went through before a failure', async () => {
    signedFetch.mockResolvedValueOnce(
      Response.json({ data: { optOutRepos: Array.from({ length: 100 }, (_, index) => result(`R_${index}`)) } }),
    );
    signedFetch.mockResolvedValueOnce(new Response('', { status: 502 }));

    const answer = await actions.optOutMaintainerRepos(Array.from({ length: 150 }, (_, index) => `R_${index}`));

    expect(answer).toMatchObject({ ok: false, error: 'FAILED' });
    expect(answer.data).toHaveLength(100);
  });

  it("signs in with the light GitHub sign-in, marked as the page's, back to the page with the mark's nonce", async () => {
    await actions.signInAsMaintainer();

    const [name, nonce, options] = jar.set.mock.calls[0];
    expect(name).toBe(maintainerSignInCookie().name);
    expect(options).toMatchObject({ httpOnly: true, maxAge: 300 });
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: `/contribute/maintainers?s=${nonce}` });
  });
});
