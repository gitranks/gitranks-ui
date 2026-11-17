import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExampleRank } from './example-cards';

const { session } = vi.hoisted(() => ({
  session: {
    data: null as { user: { githubLogin?: string } } | null,
    status: 'unauthenticated' as 'unauthenticated' | 'authenticated' | 'loading',
  },
}));

vi.mock('next-auth/react', () => ({ useSession: () => session }));

const { HeroAside } = await import('./hero-aside');

const example = (notCounted: { stars: number; repositories: number } | null): ExampleRank => ({
  login: 'cy-labs',
  avatarUrl: null,
  location: null,
  flag: null,
  ranking: 's',
  rankings: {
    s: { position: 3, previous: 3, value: 156_000, notCounted, rankedCount: 1_657_241, tier: { tier: 7, level: 5 } },
  },
});

describe('HeroAside', () => {
  beforeEach(() => {
    session.data = null;
    session.status = 'unauthenticated';
  });

  it("shows an example developer's plain stars while every star counts", () => {
    const html = renderToStaticMarkup(<HeroAside examples={[example(null)]} />);

    expect(html).toMatch(/156,000(<!-- -->)? (<!-- -->)?stars/);
    expect(html).not.toContain('<s ');
  });

  it("strikes an example developer's total with the stars not counted through before the honest one", () => {
    const html = renderToStaticMarkup(<HeroAside examples={[example({ stars: 12_300, repositories: 2 })]} />);

    expect(html).toMatch(/<s [^>]*>.*168,300.*<\/s><span>156,000<\/span>/);
  });

  it('shows the example cards to a signed-out visitor and while the session is still loading', () => {
    for (const status of ['unauthenticated', 'loading'] as const) {
      session.status = status;
      const html = renderToStaticMarkup(<HeroAside examples={[example(null)]} />);

      expect(html).toContain('aria-label="Example rank card"');
      expect(html).not.toContain('Your rank');
    }
  });

  it("shows the signed-in visitor's own card in place of the examples", () => {
    session.data = { user: { githubLogin: 'octocat' } };
    session.status = 'authenticated';
    const html = renderToStaticMarkup(<HeroAside examples={[example(null)]} />);

    expect(html).toContain('Your rank');
    expect(html).toContain('href="/profile/octocat"');
    expect(html).not.toContain('Example rank card');
  });

  it('keeps the examples for a session without a GitHub login', () => {
    session.data = { user: {} };
    session.status = 'authenticated';
    const html = renderToStaticMarkup(<HeroAside examples={[example(null)]} />);

    expect(html).toContain('Example rank card');
    expect(html).not.toContain('Your rank');
  });
});
