import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExampleRank } from './example-cards';
import { unsungHero } from '@/lib/unsung-hero/__fixtures__/hero';

const { session } = vi.hoisted(() => ({
  session: {
    current: { data: null, status: 'unauthenticated' } as {
      data: { user: { githubLogin?: string } } | null;
      status: 'unauthenticated' | 'authenticated' | 'loading';
    },
  },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
vi.mock('./use-rank-card', () => ({ useRankCard: () => ({ card: null, state: 'loading' }) }));

const { HeroAside } = await import('./hero-aside');

const example: ExampleRank = {
  login: 'cy-labs',
  avatarUrl: null,
  location: null,
  flag: null,
  ranking: 's',
  rankings: {
    s: { position: 3, previous: 3, value: 156_000, notCounted: null, rankedCount: 1_657_241, tier: null },
  },
};

describe('HeroAside with Unsung hero', () => {
  beforeEach(() => {
    session.current = { data: null, status: 'unauthenticated' };
  });

  it("draws the week's hero in the server HTML, in place of the example cards, its links plain", () => {
    const html = renderToStaticMarkup(<HeroAside examples={[example]} hero={unsungHero} />);

    expect(html).toContain('aria-label="Unsung hero of the week"');
    expect(html).not.toContain('Example rank card');
    expect(html).toContain('href="/repo/octo-labs/scroll-guard"');
    expect(html).toContain('href="/unsung-heroes"');
  });

  it("draws the week's hero in place of the signed-in visitor's own card", () => {
    session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
    const html = renderToStaticMarkup(<HeroAside examples={[example]} hero={unsungHero} />);

    expect(html).toContain('aria-label="Unsung hero of the week"');
    expect(html).not.toContain('Your rank');
  });

  it('keeps the example cards for a signed-out visitor in a week with no hero', () => {
    const html = renderToStaticMarkup(<HeroAside examples={[example]} hero={null} />);

    expect(html).toContain('aria-label="Example rank card"');
    expect(html).not.toContain('Unsung hero');
  });

  it("keeps the signed-in visitor's own card in a week with no hero", () => {
    session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
    const html = renderToStaticMarkup(<HeroAside examples={[example]} />);

    expect(html).toContain('Your rank');
    expect(html).not.toContain('Unsung hero');
  });
});
