import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RepoTierCard } from './repo-tier-card';

vi.mock('@/components/rank-chart/rank-chart', () => ({
  RankChart: ({ children, labels }: { children: React.ReactNode; labels: string[] }) => (
    <div data-labels={labels.join(',')}>{children}</div>
  ),
}));

const rank = {
  language: 'JavaScript',
  s: 21,
  sM: 23,
  l: 2,
  lM: 2,
  tier: { tier: 7, level: 5, minRank: 1, maxRank: 49, minValue: 175_007 },
  languageTier: { tier: 7, level: 5 },
};

describe('RepoTierCard', () => {
  it('shows the tier, its line, the language tier and the ranks', () => {
    const html = renderToStaticMarkup(
      <RepoTierCard rank={rank} stars={251_726} gainedThisMonth={3_100} tiers={[rank.tier]} />,
    );

    expect(html).toContain('Supernova 5');
    expect(html).toContain('Top 49 repositories on GitHub');
    expect(html).toMatch(/In (<!-- -->)?JavaScript/);
    expect(html).toContain('#21');
    expect(html).toContain('#2');
    expect(html).toContain('+3.1K');
    expect(html).toContain('data-labels="Stardust,Comet,Moon,Planet,Nova,Galaxy,Supernova"');
  });

  it('names the No language tier "Without a language", and shows N/A for unknown stars this month', () => {
    const html = renderToStaticMarkup(
      <RepoTierCard rank={{ ...rank, language: null }} stars={251_726} gainedThisMonth={null} tiers={null} />,
    );

    expect(html).toContain('Without a language');
    expect(html).not.toContain('In No language');
    expect(html).toContain('N/A');
  });

  it('leaves out the language tier where the language has none, and names No language', () => {
    const html = renderToStaticMarkup(
      <RepoTierCard rank={{ ...rank, language: null, languageTier: null }} stars={251_726} tiers={null} />,
    );

    expect(html).not.toContain('In ');
    expect(html).toContain('No language');
  });

  it("names GitHub's count, struck through, in the stars footer's label when some stars don't count", () => {
    const plain = renderToStaticMarkup(
      <RepoTierCard rank={rank} stars={251_726} gainedThisMonth={3_100} tiers={[rank.tier]} />,
    );
    const struck = renderToStaticMarkup(
      <RepoTierCard
        rank={rank}
        stars={251_726}
        starsCheck={{ notCounted: 3_720, githubStars: 255_446 }}
        gainedThisMonth={3_100}
        tiers={[rank.tier]}
      />,
    );

    expect(plain).not.toContain('<s ');
    expect(struck).toMatch(/<dt class="sr-only">Stars this month \(of.*<s [^>]*>.*255\.4K.*<\/s><span>251\.7K<\/span>/);
    // The tooltip stays the honest count.
    expect(struck).toContain('title="Stars this month (of 251.7K)"');
  });
});
