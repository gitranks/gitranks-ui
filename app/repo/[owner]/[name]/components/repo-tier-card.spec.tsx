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

  it('leaves out the language tier where the language has none, and names No language', () => {
    const html = renderToStaticMarkup(
      <RepoTierCard rank={{ ...rank, language: null, languageTier: null }} stars={251_726} tiers={null} />,
    );

    expect(html).not.toContain('In ');
    expect(html).toContain('No language');
  });
});
