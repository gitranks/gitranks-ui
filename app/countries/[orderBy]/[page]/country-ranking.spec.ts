import { describe, expect, it } from 'vitest';

import { countryAnchor } from './country-paths';
import { buildCountryRanking, COUNTRIES_PER_PAGE, countryRankingHref } from './country-ranking';
import { countrySummaries, previousCountries } from '@/components/summary-ranking/__fixtures__/summary-rankings';
import { CountrySummaryOrder } from '@/types/generated/graphql';

const factsText = (parts: ReturnType<typeof buildCountryRanking>) =>
  (parts?.facts ?? []).map((part) => (typeof part === 'string' ? part : part.text)).join('');

describe('buildCountryRanking', () => {
  const ranking = buildCountryRanking(CountrySummaryOrder.Stars, 1, countrySummaries, previousCountries);

  it('numbers the countries and moves them against last month', () => {
    expect(ranking?.rows.slice(0, 4).map((row) => [row.rank, row.country, row.previous])).toEqual([
      [1, 'United States', 1],
      [2, 'China', 2],
      [3, 'Germany', 4],
      [4, 'United Kingdom', 3],
    ]);
  });

  it("gives each row its share of the ranked metric and the metric's own leader", () => {
    const total = countrySummaries.reduce((sum, row) => sum + row.s, 0);
    expect(ranking?.rows[0].share).toBeCloseTo(countrySummaries[0].s / total);
    expect(ranking?.leadShare).toBe(ranking?.rows[0].share);
    expect(ranking?.rows[0].leader?.login).toBe(countrySummaries[0].topUsers?.s?.login);

    const byFollowers = buildCountryRanking(CountrySummaryOrder.Followers, 1, countrySummaries, null);
    expect(byFollowers?.rows[0].leader?.login).toBe(countrySummaries[0].topUsers?.f?.login);
  });

  it('lists every country for the finder, on any page', () => {
    expect(ranking?.entries).toHaveLength(countrySummaries.length);
    expect(ranking?.entries.find((e) => e.name === 'Ukraine')).toMatchObject({
      rank: 25,
      position: 25,
      previous: 25,
      flag: '🇺🇦',
    });
  });

  it('says the facts in words, with the biggest climb', () => {
    expect(factsText(ranking)).toContain('27.9% of them in the United States');
    expect(factsText(ranking)).toContain('Biggest climb since September: Italy, up 2 to #13.');
    expect(factsText(ranking)).toContain('Monthly count of October 1, 2026.');
  });

  it('leaves the moves out without last month', () => {
    const fresh = buildCountryRanking(CountrySummaryOrder.Stars, 1, countrySummaries, null);
    expect(fresh?.rows.every((row) => row.previous === null)).toBe(true);
    expect(factsText(fresh)).not.toContain('Biggest climb');
  });

  it('gives tied countries one rank, so a tie never reads as a move', () => {
    const tied = countrySummaries.map((row) =>
      row.country === 'Taiwan' ? { ...row, s: countrySummaries[17].s } : row,
    );
    const rows = buildCountryRanking(CountrySummaryOrder.Stars, 1, tied, previousCountries)?.rows ?? [];
    expect(rows.filter((row) => ['South Korea', 'Taiwan'].includes(row.country)).map((row) => row.rank)).toEqual([
      18, 18,
    ]);
    expect(rows.find((row) => row.country === 'Turkey')?.rank).toBe(20);
  });

  it('has no page past the last country', () => {
    expect(COUNTRIES_PER_PAGE).toBe(100);
    expect(buildCountryRanking(CountrySummaryOrder.Stars, 2, countrySummaries, null)).toBeNull();
  });
});

describe('country links', () => {
  it("opens the country's developer ranking for the metric ranked", () => {
    expect(countryRankingHref('United States', CountrySummaryOrder.Contributions)).toBe(
      '/country/United%20States/contributions/1',
    );
    expect(countryRankingHref('Ukraine', CountrySummaryOrder.Users)).toBe('/country/Ukraine/stars/1');
  });

  it('anchors rows with ids a selector can hold', () => {
    expect(countryAnchor('Côte d’Ivoire')).toBe('country-cote-d-ivoire');
    expect(countryAnchor('United States')).toBe('country-united-states');
  });
});
