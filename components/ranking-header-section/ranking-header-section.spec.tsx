import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DeveloperRankingHeaderSection, RankingHeaderSection } from './ranking-header-section';
import { RankingTypeClient } from '@/types/ranking.types';

vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));

const OPTIONS = [{ href: '/packages/npm/downloads/1' as Route, label: 'Downloads', active: true }];

describe('RankingHeaderSection', () => {
  it('draws the title, the options and the subtitle it is given', () => {
    const html = renderToStaticMarkup(
      <RankingHeaderSection
        title="Package Ranking · Downloads"
        options={OPTIONS}
        subtitle="Rank is based on downloads."
      />,
    );

    expect(html).toContain('<h1 class="text-2xl font-semibold">Package Ranking · Downloads</h1>');
    expect(html).toContain('href="/packages/npm/downloads/1"');
    expect(html).toContain('<div class="text-sm text-muted-foreground">Rank is based on downloads.</div>');
  });

  it('sets a pill beside the heading, not in it', () => {
    const html = renderToStaticMarkup(
      <RankingHeaderSection title="Package Ranking" pill={<span>Beta</span>} options={OPTIONS} subtitle="" />,
    );

    expect(html).toContain(
      '<div class="flex items-center gap-2"><h1 class="text-2xl font-semibold">Package Ranking</h1><span>Beta</span></div>',
    );
  });
});

describe('DeveloperRankingHeaderSection', () => {
  it("draws a developer ranking's title, its three orders and the way to one's own rank", () => {
    const html = renderToStaticMarkup(<DeveloperRankingHeaderSection rankingType={RankingTypeClient.Star} />);

    expect(html).toMatch(/<h1 class="text-2xl font-semibold">[^<]+<\/h1>/);
    expect(html).toContain('Rank By:');
    for (const order of ['stars', 'contributions', 'followers']) expect(html).toContain(`href="/by/${order}/1"`);
    expect(html).toContain('to see your rank.');
  });

  it("links a country's orders under the country", () => {
    const html = renderToStaticMarkup(
      <DeveloperRankingHeaderSection rankingType={RankingTypeClient.Contribution} countryName="Spain" />,
    );

    expect(html).toContain('href="/country/Spain/contributions/1"');
    expect(html).toContain('Spain ');
  });
});
