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

  it('signs in back to the report page it started on, its query kept; never to a page elsewhere', async () => {
    const form = new FormData();
    form.set('returnTo', '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&kind=helped');
    await actions.signInAsMaintainer(form);
    const nonce = jar.set.mock.calls[0][1];
    expect(signIn).toHaveBeenLastCalledWith('github-basic', {
      redirectTo: `/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&kind=helped&s=${nonce}`,
    });

    form.set('returnTo', 'https://evil.example/contribute/maintainers/report');
    await actions.signInAsMaintainer(form);
    expect(signIn).toHaveBeenLastCalledWith('github-basic', {
      redirectTo: `/contribute/maintainers?s=${jar.set.mock.calls[1][1]}`,
    });
  });
});

describe('the notes on a PR', () => {
  const FROM = '6650a1b2c3d4e5f6a7b8c9d0';
  const SENT = {
    feedbackId: 'F',
    kind: 'REPORT',
    number: 42,
    label: 'R-0042',
    added: false,
    role: 'MAINTAINER',
    actions: [],
  };
  const report = {
    from: FROM,
    reasons: ['IGNORES_CONTRIBUTING', 'NOPE', 'IGNORES_CONTRIBUTING'] as never[],
    details: '  It changed our lockfile.  ',
    replyTo: ' sam@driftwood.dev ',
    actions: ['STOP_PR', 'DELETE_REPO'] as never[],
  };

  beforeEach(() => {
    signedFetch.mockReset();
    currentSessionToken.mockReset();
    currentSessionToken.mockResolvedValue(session());
  });

  it('sends a report with the token as a variable, known reasons and actions alone, trimmed text', async () => {
    signedFetch.mockResolvedValueOnce(Response.json({ data: { reportContributePr: SENT } }));

    const answer = await actions.sendPrReport(report);

    expect(answer).toEqual({ ok: true, data: SENT });
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
    const [{ query, variables }] = bodies();
    expect(query).toContain('reportContributePr(');
    expect(query).not.toContain(TOKEN);
    expect(variables).toEqual({
      token: TOKEN,
      from: FROM,
      reasons: ['IGNORES_CONTRIBUTING'],
      details: 'It changed our lockfile.',
      replyTo: 'sam@driftwood.dev',
      actions: ['STOP_PR'],
    });
  });

  it('sends nothing for a report without a reason, a bad address or an id we did not give', async () => {
    for (const bad of [
      { ...report, reasons: [] },
      { ...report, replyTo: 'not an address' },
      { ...report, details: 'x'.repeat(2001) },
      { ...report, from: 'R_1' },
    ]) {
      expect(await actions.sendPrReport(bad)).toEqual({ ok: false, error: 'INVALID' });
    }
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('sends "this PR helped" with its likes, word and quote choice', async () => {
    signedFetch.mockResolvedValueOnce(Response.json({ data: { contributePrHelped: { ...SENT, kind: 'HELPED' } } }));

    await actions.sendPrHelped({
      from: FROM,
      likes: ['SOLVED_WELL', 'WHATEVER'] as never[],
      word: ' Clean fix. ',
      mayQuote: 'yes' as never,
      replyTo: '',
    });

    const [{ query, variables }] = bodies();
    expect(query).toContain('contributePrHelped(');
    expect(variables).toEqual({
      token: TOKEN,
      from: FROM,
      likes: ['SOLVED_WELL'],
      word: 'Clean fix.',
      mayQuote: false,
      replyTo: null,
    });
  });

  it('undoes an action with the repo it is in', async () => {
    const undone = { feedbackId: FROM, actions: [] };
    signedFetch.mockResolvedValueOnce(Response.json({ data: { undoContributePrAction: undone } }));

    expect(await actions.undoPrAction({ feedbackId: FROM, repoId: 'R_kgDOabc', kind: 'STOP_PR' })).toEqual({
      ok: true,
      data: undone,
    });
    expect(bodies()[0].variables).toEqual({ token: TOKEN, feedbackId: FROM, repoId: 'R_kgDOabc', kind: 'STOP_PR' });
    expect(await actions.undoPrAction({ feedbackId: FROM, repoId: 'R 1', kind: 'STOP_PR' })).toEqual({
      ok: false,
      error: 'INVALID',
    });
    expect(await actions.undoPrAction({ feedbackId: FROM, repoId: 'R_1', kind: 'DROP' as never })).toEqual({
      ok: false,
      error: 'INVALID',
    });
  });

  it('asks nothing without the page sign-in', async () => {
    currentSessionToken.mockResolvedValue(null);

    expect(await actions.sendPrReport(report)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(await actions.undoPrAction({ feedbackId: FROM, repoId: 'R_1', kind: 'STOP_PR' })).toEqual({
      ok: false,
      error: 'SIGNED_OUT',
    });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['CONFLICT', 'OWN_PR'],
    ['RATE_LIMITED', 'RATE_LIMITED'],
    ['NOT_FOUND', 'NOT_OURS'],
  ])('tells %s as %s, never in the words of the answer', async (code, error) => {
    signedFetch.mockResolvedValueOnce(
      Response.json({ data: null, errors: [{ message: `refused ${TOKEN}`, extensions: { code } }] }),
    );

    const answer = await actions.sendPrReport(report);

    expect(answer).toEqual({ ok: false, error });
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
  });
});

describe('setMaintainerConfig', () => {
  const SAVED = {
    repoId: 'R_1',
    config: [
      {
        key: 'max_files',
        value: '10',
        source: 'PAGE',
        setBy: 'octocat',
        ignoredRaw: null,
        fileReadAt: '2026-11-03T08:40:00.000Z',
      },
    ],
    rules: { manualOnly: false, lines: [] },
  };

  beforeEach(() => {
    signedFetch.mockReset();
    currentSessionToken.mockReset();
    currentSessionToken.mockResolvedValue(session());
  });

  it('sends one key with the token as a variable, trimmed, and gives back the repo after it', async () => {
    signedFetch.mockResolvedValueOnce(Response.json({ data: { setContributeMaintainerConfig: SAVED } }));

    const answer = await actions.setMaintainerConfig({ repoId: 'R_1', key: 'max_files', value: ' 10 ' });

    expect(answer).toEqual({ ok: true, data: SAVED });
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
    const [{ query, variables }] = bodies();
    expect(variables).toEqual({ token: TOKEN, repoId: 'R_1', key: 'max_files', value: '10' });
    expect(query).not.toContain(TOKEN);
    expect(signedFetch.mock.calls[0][3]).toBeUndefined();
  });

  it('clears the page value with null, an empty value included', async () => {
    signedFetch.mockResolvedValue(Response.json({ data: { setContributeMaintainerConfig: SAVED } }));

    await actions.setMaintainerConfig({ repoId: 'R_1', key: 'contact', value: null });
    await actions.setMaintainerConfig({ repoId: 'R_1', key: 'contact', value: '  ' });

    expect(bodies().map(({ variables }) => (variables as { value: unknown }).value)).toEqual([null, null]);
  });

  it.each([
    [{ repoId: 'R 1', key: 'max_files', value: '1' }],
    [{ repoId: 'R_1', key: 'Max-Files', value: '1' }],
    [{ repoId: 'R_1', key: 'contact', value: 'x'.repeat(201) }],
    [{ repoId: 'R_1', key: 'max_files', value: 7 as never }],
  ])('asks nothing for a malformed input', async (input) => {
    expect(await actions.setMaintainerConfig(input)).toEqual({ ok: false, error: 'INVALID' });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('asks nothing without the page sign-in', async () => {
    currentSessionToken.mockResolvedValue(null);

    expect(await actions.setMaintainerConfig({ repoId: 'R_1', key: 'max_files', value: '1' })).toEqual({
      ok: false,
      error: 'SIGNED_OUT',
    });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['CONFLICT', 'IN_FILE'],
    ['FORBIDDEN', 'NOT_MAINTAINER'],
    ['NOT_FOUND', 'NOT_MAINTAINER'],
    ['BAD_USER_INPUT', 'INVALID'],
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['INTERNAL_SERVER_ERROR', 'FAILED'],
  ])('tells %s as %s, never in the words of the answer', async (code, error) => {
    signedFetch.mockResolvedValueOnce(
      Response.json({ data: null, errors: [{ message: `refused ${TOKEN}`, extensions: { code } }] }),
    );

    const answer = await actions.setMaintainerConfig({ repoId: 'R_1', key: 'max_files', value: '1' });

    expect(answer).toEqual({ ok: false, error });
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
  });
});
