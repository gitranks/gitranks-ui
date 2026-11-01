import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { type ExampleRank, HeroAside } from './hero-aside';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));

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
  it("shows an example developer's plain stars while every star counts", () => {
    const html = renderToStaticMarkup(<HeroAside examples={[example(null)]} />);

    expect(html).toMatch(/156,000(<!-- -->)? (<!-- -->)?stars/);
    expect(html).not.toContain('<s ');
  });

  it("strikes an example developer's total with the stars not counted through before the honest one", () => {
    const html = renderToStaticMarkup(<HeroAside examples={[example({ stars: 12_300, repositories: 2 })]} />);

    expect(html).toMatch(/<s [^>]*>.*168,300.*<\/s><span>156,000<\/span>/);
  });
});
