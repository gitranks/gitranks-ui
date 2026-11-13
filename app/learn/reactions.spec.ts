import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, signIn, token, jar, store } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    graphqlDirect: vi.fn(),
    signIn: vi.fn(),
    token: vi.fn(),
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
vi.mock('@/lib/contribute/session-token', () => ({ currentSessionToken: vi.fn() }));
vi.mock('@/lib/contribute/maintainer-token', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/contribute/maintainer-token')>()),
  currentMaintainerToken: token,
}));

const { reactOnReturn, reactToLessonResult, signInToReact } = await import('./actions');
const { ReactToResultDocument } = await import('@/lib/learn/learn.documents');
const { reactMarkCookie } = await import('@/lib/learn/react-mark');

const SLUG = 'route-cache-miss-8f3k';
const STORED = [{ login: 'mona', role: 'maintainer', reaction: 'YES' }];

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe('reactions on a result page', () => {
  beforeEach(() => {
    store.clear();
    jar.set.mockClear();
    graphqlDirect.mockReset();
    graphqlDirect.mockResolvedValue({ reactToResult: STORED });
    signIn.mockReset();
    token.mockReset();
    token.mockResolvedValue('gho_x');
  });

  it("stores a click at once with the light sign-in's token, read from the session alone", async () => {
    expect(await reactToLessonResult(SLUG, 'octocat', 'YES')).toEqual({ ok: true, data: STORED });
    expect(graphqlDirect).toHaveBeenCalledWith(
      ReactToResultDocument,
      { slug: SLUG, login: 'octocat', reaction: 'YES', token: 'gho_x' },
      { source: 'client' },
    );
  });

  it('asks for the sign-in without a token, and refuses what is not a reaction on a result page', async () => {
    token.mockResolvedValue(null);
    expect(await reactToLessonResult(SLUG, 'octocat', 'YES')).toEqual({ ok: false, error: 'SIGNED_OUT' });
    token.mockResolvedValue('gho_x');
    for (const [slug, login, reaction] of [
      ['a/b', 'octocat', 'YES'],
      [SLUG, 'octo.cat', 'YES'],
      [SLUG, 'octocat', 'MAYBE'],
    ]) {
      expect(await reactToLessonResult(slug, login, reaction as 'YES')).toEqual({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('signs in back to the result page with the pick in its address, leaving the mark of the pick', async () => {
    await signInToReact(form({ slug: SLUG, login: 'octocat', reaction: 'NO' }));

    const [[, redirect]] = signIn.mock.calls;
    expect(redirect.redirectTo).toMatch(
      new RegExp(`^/learn/lessons/${SLUG}/passes/octocat\\?react=no&s=[0-9a-f-]{36}$`),
    );
    expect(store.get(reactMarkCookie().name)).toBe(`${SLUG}/octocat/NO`);
  });

  it('signs in back to the maintainers page for a form that names no result page', async () => {
    await signInToReact(form({ slug: SLUG, login: '../contribute', reaction: 'NO' }));

    expect(signIn.mock.calls[0][1].redirectTo).toMatch(/^\/contribute\/maintainers\?s=/);
    expect(store.has(reactMarkCookie().name)).toBe(false);
  });

  it('stores the pick back from the sign-in only with the mark this browser left for it, once', async () => {
    expect(await reactOnReturn(SLUG, 'octocat', 'NO')).toEqual({ ok: false, error: 'INVALID' });

    await signInToReact(form({ slug: SLUG, login: 'octocat', reaction: 'NO' }));
    expect(await reactOnReturn(SLUG, 'octocat', 'YES')).toEqual({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();

    await signInToReact(form({ slug: SLUG, login: 'octocat', reaction: 'NO' }));
    expect(await reactOnReturn(SLUG, 'OctoCat', 'NO')).toEqual({ ok: true, data: STORED });
    expect(await reactOnReturn(SLUG, 'octocat', 'NO')).toEqual({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });
});
