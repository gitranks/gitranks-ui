import { describe, expect, it } from 'vitest';

import { northwindProcess, northwindSources } from './__fixtures__/companies';
import { northwindSeniorPlan } from './__fixtures__/plans';
import {
  basisWordsOf,
  dayWordsOf,
  publishedWordsOf,
  readOnOf,
  SEARCH_SUMMARY_WORDS,
  sourceKindWordsOf,
  sourceLineOf,
  sourcesOf,
  sourcesOfFacts,
  sourcesWordsOf,
  sourceTitleOf,
  statedByCompany,
} from './sources';

const byId = (id: string) => {
  const source = northwindSources.find((one) => one.id === id);
  if (!source) throw new Error(id);
  return source;
};

describe('who states a fact', () => {
  it('says it in one of three wordings, with a tick only when the company states it', () => {
    expect(basisWordsOf('official', 'Northwind')).toBe('Northwind states');
    expect(basisWordsOf('both', 'Northwind')).toBe('Northwind and candidates');
    expect(basisWordsOf('reported', 'Northwind')).toBe('Candidates report');
    expect(statedByCompany('official')).toBe(true);
    expect(statedByCompany('both')).toBe(true);
    expect(statedByCompany('reported')).toBe(false);
  });
});

describe('a source as its row says it', () => {
  it('names what each kind of source is', () => {
    expect(sourceKindWordsOf('official', 'Northwind')).toBe("Northwind's own page");
    expect(sourceKindWordsOf('handbook', 'Northwind')).toBe('A handbook');
    expect(sourceKindWordsOf('candidate_report', 'Northwind')).toBe("A candidate's report");
    expect(sourceKindWordsOf('guide', 'Northwind')).toBe('A guide');
    expect(sourceKindWordsOf('news', 'Northwind')).toBe('A news story');
    expect(sourceKindWordsOf('listing', 'Northwind')).toBe('A job listing');
  });

  it('says when it was published by month, or by year alone, and nothing for no date or a bad one', () => {
    expect(publishedWordsOf('2026-05')).toBe('May 2026');
    expect(publishedWordsOf('2025-11-04')).toBe('Nov 2025');
    expect(publishedWordsOf('2025-11-04T10:00:00Z')).toBe('Nov 2025');
    expect(publishedWordsOf('2024')).toBe('2024');
    for (const none of [null, undefined, '', 'May', '2025-13']) expect(publishedWordsOf(none)).toBeNull();
  });

  it('writes a day as the pages do', () => {
    expect(dayWordsOf('2026-11-26')).toBe('26 Nov 2026');
    expect(dayWordsOf('2026-01-03T08:00:00.000Z')).toBe('3 Jan 2026');
    expect(dayWordsOf('2026-11')).toBeNull();
    expect(dayWordsOf('2026-11-32')).toBeNull();
    expect(dayWordsOf(null)).toBeNull();
  });

  it('gives the line under the title: site, kind, date, and how it was read only when through search results', () => {
    expect(sourceLineOf(byId('o1'), 'Northwind')).toEqual([
      'careers.northwind.example',
      "Northwind's own page",
      'May 2026',
    ]);
    expect(sourceLineOf(byId('r2'), 'Northwind')).toEqual([
      'reports.example',
      "A candidate's report",
      'Mar 2026',
      SEARCH_SUMMARY_WORDS,
    ]);
    expect(sourceLineOf(byId('g1'), 'Northwind')).toEqual(['guides.example', 'A guide', 'Oct 2026']);
    expect(sourceLineOf(byId('l1'), 'Northwind')).toEqual(['jobs.example', 'A job listing']);
  });

  it('titles a source by its site when the research kept no title', () => {
    expect(sourceTitleOf(byId('o1'))).toBe('How we interview');
    expect(sourceTitleOf(byId('l1'))).toBe('jobs.example');
    expect(sourceTitleOf({ ...byId('o1'), title: '   ' })).toBe('careers.northwind.example');
  });
});

describe('the sources of a set of facts', () => {
  it('counts them in words', () => {
    expect(sourcesWordsOf(1)).toBe('1 source');
    expect(sourcesWordsOf(21)).toBe('21 sources');
  });

  it('gives each source once, in the order the facts name them, skipping an id with no source', () => {
    expect(sourcesOf(['r1', 'o1', 'r1', 'missing'], northwindSources).map((source) => source.id)).toEqual(['r1', 'o1']);
    expect(sourcesOfFacts(northwindProcess, northwindSources).map((source) => source.id)).toEqual([
      'o2',
      'o1',
      'r1',
      'r2',
    ]);
  });

  it('says the newest day they were read on', () => {
    expect(readOnOf(northwindSeniorPlan.sources)).toBe('26 Nov 2026');
    expect(readOnOf([{ ...byId('o1'), readAt: '2026-10-01' }, byId('o2')])).toBe('26 Nov 2026');
    expect(readOnOf([])).toBeNull();
  });
});
