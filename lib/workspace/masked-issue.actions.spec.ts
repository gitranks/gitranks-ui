import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, signIn, jar, store } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    graphqlDirect: vi.fn(),
    signIn: vi.fn(),
    store,
    jar: {
      get: vi.fn((name: string) => (store.has(name) ? { name, value: store.get(name) } : undefined)),
      set: vi.fn((name: string, value: string, options?: { maxAge?: number }) => {
        if (options?.maxAge === 0) store.delete(name);
        else store.set(name, value);
      }),
    },
  };
});
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => jar }));
vi.mock('@/auth', () => ({ auth: vi.fn(), signIn }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin, viewerEmail: vi.fn(async () => undefined) }));

const actions = await import('./masked-issue.actions');
const { issueLookMarkCookie } = await import('./issue-look-mark');
const { fullPage } = await import('./__fixtures__/masked-issue');
const { print } = await import('graphql');

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};
const lastCall = () => {
  const [document, variables, options] = graphqlDirect.mock.lastCall ?? [];
  return { name: /(?:query|mutation) (\w+)/.exec(print(document))?.[1], variables, options };
};
const MARK = issueLookMarkCookie().name;

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  viewerLogin.mockResolvedValue('octocat');
  graphqlDirect.mockImplementation(async (document) => {
    const name = /(?:query|mutation) (\w+)/.exec(print(document))?.[1];
    if (name === 'LookAtIssue') return { lookAtIssue: { outcome: 'OK', page: fullPage() } };
    if (name === 'IssuePage') return { issuePage: fullPage() };
    return { giveBackIssue: fullPage(), setIssueOutReason: fullPage(), saveIssueOutNote: fullPage() };
  });
});

describe("the page of one issue's actions", () => {
  it('look as the session’s user, on the list the person came from, from the web', async () => {
    expect(await actions.lookAtIssue('q7k2m9xa', 'learn')).toEqual({
      ok: true,
      data: { outcome: 'OK', page: fullPage() },
    });
    expect(lastCall()).toMatchObject({
      name: 'LookAtIssue',
      variables: { id: 'q7k2m9xa', surface: 'LEARN', channel: 'WEB' },
      options: { source: 'client', githubLogin: 'octocat' },
    });
    await actions.lookAtIssue('q7k2m9xa', 'anything' as never);
    expect(lastCall().variables).toMatchObject({ surface: 'CONTRIBUTE' });
  });

  it('take nothing but a mask id, a reason of a give-back and a note of up to 1,000 characters', async () => {
    for (const id of ['', '../x', 'a b', 'x'.repeat(65), 42 as never]) {
      expect(await actions.lookAtIssue(id, 'learn')).toEqual({ ok: false, error: 'INVALID' });
      expect(await actions.giveBackIssue(id)).toEqual({ ok: false, error: 'INVALID' });
    }
    expect(await actions.setIssueOutReason('q7k2m9xa', 'NOT_INTERESTING', true)).toEqual({
      ok: false,
      error: 'INVALID',
    });
    expect(await actions.saveIssueOutNote('q7k2m9xa', 'x'.repeat(1001))).toEqual({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
    await actions.setIssueOutReason('q7k2m9xa', 'FIXED', true);
    expect(lastCall()).toMatchObject({ name: 'SetIssueOutReason', variables: { reason: 'FIXED', on: true } });
  });

  it('say so to a viewer signed out, asking nothing', async () => {
    viewerLogin.mockResolvedValueOnce(null);
    expect(await actions.giveBackIssue('q7k2m9xa')).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('a visitor’s press, through the sign-in', () => {
  /** The issue's page, through Learn's onboarding: where a sign-in from a Learn row leads. */
  const throughLearn = (issue: string) => `/learn/setup?back=${encodeURIComponent(issue)}`;

  it('leaves a mark for the issue and signs in back to its page, with the press in the address', async () => {
    await actions.signInToSeeIssue(form({ id: 'q7k2m9xa', from: 'contribute' }));
    expect(store.get(MARK)).toBe('q7k2m9xa');
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/my/issues/q7k2m9xa?from=contribute&look=1' });
  });

  it("from a Learn row, signs in to Learn's onboarding, which leads back to the issue's page", async () => {
    await actions.signInToSeeIssue(form({ id: 'q7k2m9xa', from: 'learn' }));
    expect(store.get(MARK)).toBe('q7k2m9xa');
    expect(signIn).toHaveBeenCalledWith('github-basic', {
      redirectTo: throughLearn('/my/issues/q7k2m9xa?from=learn&look=1'),
    });
  });

  it("carries the Learn view's filters back to the page, and nothing else", async () => {
    await actions.signInToSeeIssue(
      form({ id: 'q7k2m9xa', from: 'learn', view: 'lesson=a-queue&next=https://evil.example&for-you=0' }),
    );
    expect(signIn).toHaveBeenCalledWith('github-basic', {
      redirectTo: throughLearn('/my/issues/q7k2m9xa?from=learn&lesson=a-queue&for-you=0&look=1'),
    });
  });

  it('is made on return, once, from the sign-in, when the mark names the issue', async () => {
    await actions.signInToSeeIssue(form({ id: 'q7k2m9xa', from: 'contribute' }));
    const looked = await actions.lookOnReturn('q7k2m9xa', 'contribute');
    expect(looked).toEqual({ ok: true, data: { outcome: 'OK', page: fullPage() } });
    expect(lastCall()).toMatchObject({
      name: 'LookAtIssue',
      variables: { id: 'q7k2m9xa', surface: 'CONTRIBUTE', channel: 'SIGN_IN' },
    });
    // The mark is used up: a reload, or the link sent to someone else, counts nothing.
    graphqlDirect.mockClear();
    expect(await actions.lookOnReturn('q7k2m9xa', 'contribute')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('makes no press for a link carrying ?look=1 alone, or a mark of another issue', async () => {
    expect(await actions.lookOnReturn('q7k2m9xa', 'learn')).toBeNull();
    store.set(MARK, 'other');
    expect(await actions.lookOnReturn('q7k2m9xa', 'learn')).toBeNull();
    expect(store.has(MARK)).toBe(false);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('uses the mark up when the page is already past its hidden details, making no press', async () => {
    await actions.signInToSeeIssue(form({ id: 'q7k2m9xa', from: 'learn' }));
    graphqlDirect.mockClear();
    expect(await actions.lookOnReturn('q7k2m9xa', 'learn', false)).toBeNull();
    expect(store.has(MARK)).toBe(false);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('signs in back home when the form names no issue', async () => {
    await actions.signInToSeeIssue(form({ id: '../x' }));
    expect(store.size).toBe(0);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/' });
  });
});
