import { beforeEach, describe, expect, it, vi } from 'vitest';

const { jar, store } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
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

const { hasReactionMark, markReaction, reactMarkCookie, takeReactionMark } = await import('./react-mark');

const SLUG = 'route-cache-miss-8f3k';

describe("a reaction's mark through the sign-in", () => {
  beforeEach(() => store.clear());

  it('is an HTTP-only __Host- cookie in production, for 10 minutes', async () => {
    expect(reactMarkCookie(true)).toEqual({
      name: '__Host-gitranks-learn-react',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
    });
    expect(await markReaction(SLUG, 'octocat', 'YES')).toBe(true);
    expect(jar.set).toHaveBeenLastCalledWith(
      reactMarkCookie().name,
      `${SLUG}/octocat/YES`,
      expect.objectContaining({ maxAge: 600 }),
    );
  });

  it('is left only for a result page as the site writes it', async () => {
    expect(await markReaction('a/b', 'octocat', 'YES')).toBe(false);
    expect(await markReaction(SLUG, 'octo.cat', 'YES')).toBe(false);
    expect(store.size).toBe(0);
  });

  it('names one page and one pick; read without using it, then taken once', async () => {
    await markReaction(SLUG, 'OctoCat', 'NO');
    expect(await hasReactionMark(SLUG, 'octocat', 'YES')).toBe(false);
    expect(await hasReactionMark('other-1', 'octocat', 'NO')).toBe(false);
    expect(await hasReactionMark(SLUG, 'octocat', 'NO')).toBe(true);
    expect(await takeReactionMark(SLUG, 'octocat', 'NO')).toBe(true);
    expect(await takeReactionMark(SLUG, 'octocat', 'NO')).toBe(false);
  });
});
