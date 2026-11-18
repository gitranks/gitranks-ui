import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { developerRankingOptions, RankingTypeSwitcher } from './ranking-type-switcher';
import { RankingTypeClient } from '@/types/ranking.types';

const links = (html: string) =>
  [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*?(data-state="active")?[^>]*>([^<]+)/g)].map(([, href, , label]) => [
    href,
    label,
  ]);

describe('RankingTypeSwitcher', () => {
  it('draws the options it is given, the shown one marked, after its label', () => {
    const html = renderToStaticMarkup(
      <RankingTypeSwitcher
        label="Rank by:"
        options={[
          { href: '/packages/npm/downloads/1' as Route, label: 'Downloads', active: true },
          { href: '/packages/npm/dependents/1' as Route, label: 'Dependents', active: false },
        ]}
      />,
    );

    expect(html).toMatch(/^<div class="text-sm flex flex-col gap-1">Rank by:<div/);
    expect(links(html)).toEqual([
      ['/packages/npm/downloads/1', 'Downloads'],
      ['/packages/npm/dependents/1', 'Dependents'],
    ]);
    expect(html.match(/data-state="active"/g)).toHaveLength(1);
    expect(html).toMatch(/data-state="active"[^>]*>Downloads/);
  });

  it("keeps the developer rankings' label and three orders", () => {
    const html = renderToStaticMarkup(
      <RankingTypeSwitcher options={developerRankingOptions(RankingTypeClient.Follower, '/country/Spain')} />,
    );

    expect(html).toContain('>Rank By:<');
    expect(links(html)).toEqual([
      ['/country/Spain/stars/1', 'Stars'],
      ['/country/Spain/contributions/1', 'Contributions'],
      ['/country/Spain/followers/1', 'Followers'],
    ]);
    expect(html).toMatch(/data-state="active"[^>]*>Followers/);
  });
});
