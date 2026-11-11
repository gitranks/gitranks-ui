import { describe, expect, it } from 'vitest';

import { buildLanguageRanking, LANGUAGE_ORDERS, languagesPath } from './language-ranking';
import {
  belgiumLanguagePage,
  belgiumLanguages,
  previousBelgiumLanguages,
  previousWorldLanguages,
  worldLanguagePage,
  worldLanguages,
} from '@/components/summary-ranking/__fixtures__/summary-rankings';
import { LanguageSummaryOrder } from '@/types/generated/graphql';

const factsText = (ranking: ReturnType<typeof buildLanguageRanking>) =>
  (ranking?.facts ?? []).map((part) => (typeof part === 'string' ? part : part.text)).join('');

const belgium = (overrides: Partial<Parameters<typeof buildLanguageRanking>[0]> = {}) =>
  buildLanguageRanking({
    scope: 'Belgium',
    order: LanguageSummaryOrder.Score,
    page: 1,
    all: belgiumLanguages,
    pageRows: belgiumLanguagePage,
    previous: previousBelgiumLanguages,
    world: worldLanguages,
    ...overrides,
  });

describe('buildLanguageRanking', () => {
  it("ranks a country's languages with their moves and worldwide places", () => {
    expect(
      belgium()
        ?.rows.slice(2, 6)
        .map((row) => [row.rank, row.language, row.previous, row.worldRank]),
    ).toEqual([
      [3, 'Lua', 3, 21],
      [4, 'PHP', 4, 15],
      [5, 'TypeScript', 5, 3],
      [6, 'Shell', 10, 9],
    ]);
  });

  it('names what stands out in a country on its first page only', () => {
    expect(belgium()?.standOuts.map(({ kind, row }) => [kind, row.language])).toEqual([
      ['above-world', 'Lua'],
      ['above-world', 'PHP'],
      ['climb', 'Shell'],
    ]);
    expect(belgium({ world: null })?.standOuts).toEqual([]);
  });

  it('has nothing to stand out from worldwide', () => {
    const world = buildLanguageRanking({
      scope: 'global',
      order: LanguageSummaryOrder.Score,
      page: 1,
      all: worldLanguages,
      pageRows: worldLanguagePage,
      previous: previousWorldLanguages,
      world: null,
    });
    expect(world?.standOuts).toEqual([]);
    expect(world?.rows[0].worldRank).toBeNull();
    expect(factsText(world)).toContain('on the repositories of developers on GitRanks; Python leads with 22.6%');
  });

  it('writes the facts for the scope, with links back to all developers', () => {
    const text = factsText(belgium());
    expect(text).toContain('developers in Belgium; Python leads');
    expect(text).toContain('Biggest climb since September: Shell, up 4 to #6.');
    expect(text).toContain("All developers · Belgium's developers");
  });

  it('counts developers without a share of the sum', () => {
    const byDevelopers = belgium({ order: LanguageSummaryOrder.Users });
    expect(LANGUAGE_ORDERS[LanguageSummaryOrder.Users].showShare).toBe(false);
    expect(factsText(byDevelopers)).toContain('Each developer counts in their top 5 languages');
  });

  it('ranks by value, so the page and the full list agree whatever order ties come in', () => {
    // Shell and Go tie this month; the page lists them one way, the full list the other.
    const tie = (rows: typeof belgiumLanguages) =>
      rows.map((row) => (row.language === 'Shell' || row.language === 'Go' ? { ...row, score: 38_000 } : row));
    const page = tie(belgiumLanguagePage as typeof belgiumLanguages) as typeof belgiumLanguagePage;
    const all = tie(belgiumLanguages).toSorted((a, b) => (a.language === 'Go' ? -1 : b.language === 'Go' ? 1 : 0));
    const rows = belgium({ all, pageRows: page })?.rows ?? [];
    expect(rows.filter((row) => ['Shell', 'Go'].includes(row.language)).map((row) => row.rank)).toEqual([6, 6]);
    expect(rows.map((row) => row.rank)).toEqual(rows.map((row) => row.rank).toSorted((a, b) => a - b));
  });

  it('still shows the page without the full list, or with one from another month', () => {
    for (const all of [null, belgiumLanguages.map((row) => ({ ...row, date: '2026-11-01' }))]) {
      const ranking = belgium({ all });
      expect(ranking?.rows.map((row) => row.rank).slice(0, 3)).toEqual([1, 2, 3]);
      expect(ranking?.rows.every((row) => row.previous === null && row.worldRank === null)).toBe(true);
      expect(ranking?.sharesKnown).toBe(false);
      expect(ranking?.languagesCount).toBeNull();
      expect(ranking?.standOuts).toEqual([]);
      expect(ranking?.facts).toEqual([]);
    }
  });

  it('offers a next page without the full list only when this one is full', () => {
    const hundred = Array.from({ length: 100 }, (_, i) => ({ ...belgiumLanguagePage[0], language: `L${i}` }));
    expect(belgium({ all: null, pageRows: hundred })?.pageCount).toBe(2);
    expect(belgium({ all: null })?.pageCount).toBe(1);
  });

  it('names no stand-outs past the first page', () => {
    const filler = Array.from({ length: 100 }, (_, i) => ({
      ...belgiumLanguages[0],
      language: `Tiny ${i}`,
      score: 100 - i,
    }));
    const all = [...belgiumLanguages, ...filler];
    const pageRows = filler.map((row) => ({ ...belgiumLanguagePage[0], ...row })) as typeof belgiumLanguagePage;
    const ranking = belgium({ all, pageRows, page: 2 });
    expect(ranking?.rows[0].rank).toBe(21);
    expect(ranking?.standOuts).toEqual([]);
  });

  it('has no page past the last language', () => {
    expect(belgium({ page: 2 })).toBeNull();
  });
});

describe('languagesPath', () => {
  it('keeps the URLs the site already has', () => {
    expect(languagesPath('global', LanguageSummaryOrder.Score)).toBe('/languages/global/score/1');
    expect(languagesPath('United States', LanguageSummaryOrder.Users, 2)).toBe('/languages/United%20States/users/2');
  });
});
