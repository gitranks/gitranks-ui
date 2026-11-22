import { describe, expect, it } from 'vitest';

import { heroUsageFigure, heroUsageOf, heroUsagePhrase } from './hero-usage';

const compact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const full = (n: number) => new Intl.NumberFormat('en-US').format(n);

describe('heroUsageOf', () => {
  it('reads an answer with no period as a week, as every hero before months was', () => {
    expect(heroUsageOf({ weeklyDownloads: 98_800_000 })).toEqual({
      downloads: 98_800_000,
      downloadsPer: 'week',
      dependents: null,
    });
  });

  it("takes the registry's period, and none for a registry with no counts", () => {
    expect(heroUsageOf({ weeklyDownloads: 1_034_000, downloads: 4_480_000, downloadsPer: 'MONTH' })).toMatchObject({
      downloads: 4_480_000,
      downloadsPer: 'month',
    });
    expect(heroUsageOf({ weeklyDownloads: 0, downloads: null, downloadsPer: null, dependents: 45 })).toEqual({
      downloads: null,
      downloadsPer: null,
      dependents: 45,
    });
  });
});

describe('the figure and the phrase', () => {
  it('say the period', () => {
    expect(heroUsageFigure({ downloads: 98_800_000, downloadsPer: 'week', dependents: 4 }, compact)).toEqual({
      value: '98.8M',
      label: 'downloads a week',
    });
    expect(heroUsagePhrase({ downloads: 4_480_000, downloadsPer: 'month', dependents: null }, compact)).toBe(
      '4.5M downloads a month',
    );
  });

  it('say the dependents for a registry with no counts, one or many', () => {
    expect(heroUsageFigure({ downloads: null, downloadsPer: null, dependents: 45 }, full)).toEqual({
      value: '45',
      label: 'repositories with 100+ stars use it',
    });
    expect(heroUsageFigure({ downloads: null, downloadsPer: null, dependents: 1 }, full)?.label).toBe(
      'repository with 100+ stars uses it',
    );
    expect(heroUsagePhrase({ downloads: null, downloadsPer: null, dependents: 45 }, full)).toBe(
      'used by 45 GitHub repositories with 100+ stars',
    );
  });

  it('say nothing when nothing is known', () => {
    expect(heroUsageFigure({ downloads: null, downloadsPer: null, dependents: null }, full)).toBeNull();
    expect(heroUsagePhrase({ downloads: null, downloadsPer: null, dependents: 0 }, full)).toBeNull();
  });
});
