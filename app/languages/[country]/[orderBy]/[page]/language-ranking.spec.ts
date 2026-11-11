import { describe, expect, it } from 'vitest';

import { buildLanguageRanking, languagesPath } from './language-ranking';
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
    expect(factsText(byDevelopers)).toContain('Each developer counts in their top 5 languages');
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
