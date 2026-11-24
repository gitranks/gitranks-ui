import { describe, expect, it } from 'vitest';

import { bothNumbers, contributorNumbers, firstFixNumbers, learnerNumbers, SKILLS_NOW } from './__fixtures__/skills';
import type { SkillsFigure } from './skills.types';
import {
  dayWordsOf,
  figureWordsOf,
  hasSomething,
  listWords,
  monthOf,
  numbersFor,
  shownFigures,
  sinceLineOf,
  withoutLearnOf,
} from './skills-figures';

const figure = (key: SkillsFigure['key'], value: number | null, extra: Partial<SkillsFigure> = {}): SkillsFigure => ({
  key,
  value,
  second: null,
  name: null,
  also: null,
  ...extra,
});

describe('hasSomething and shownFigures: no number is ever a zero', () => {
  it('leaves out a zero, a missing number and an agent without a name', () => {
    expect(hasSomething(figure('HELPED', 0))).toBe(false);
    expect(hasSomething(figure('HELPED', null))).toBe(false);
    expect(hasSomething(figure('AGENT', null, { name: '  ' }))).toBe(false);
    expect(hasSomething(figure('AGENT', null, { name: 'Codex' }))).toBe(true);
    expect(hasSomething(figure('MASTERED', 1))).toBe(true);
  });

  it('keeps the order of what is left, with no hole', () => {
    const shown = shownFigures([figure('FIXES_MERGED', 2), figure('HELPED', 0), figure('DAYS_ACTIVE', 5)]);
    expect(shown.map((one) => one.key)).toEqual(['FIXES_MERGED', 'DAYS_ACTIVE']);
  });
});

describe('figureWordsOf', () => {
  it('words each figure, in the singular for one', () => {
    expect(figureWordsOf(figure('FIXES_MERGED', 1, { second: 1 }), 'CONTRIBUTOR', 1)).toEqual({
      value: '1',
      mono: true,
      label: 'fix merged',
      under: 'in 1 project',
    });
    expect(figureWordsOf(figure('FIXES_MERGED', 1234, { second: 5 }), 'CONTRIBUTOR', 6)).toMatchObject({
      value: '1,234',
      label: 'fixes merged',
      under: 'in 5 projects',
    });
    expect(figureWordsOf(figure('PULL_REQUESTS_OPEN', 2, { second: 2 }), 'CONTRIBUTOR', 2)).toMatchObject({
      label: 'pull requests open',
      under: 'in 2 projects',
    });
    expect(figureWordsOf(figure('LESSONS_LEARNED', 1, { second: 1 }), 'LEARNER', 0)).toMatchObject({
      label: 'lesson learned',
      under: 'in 1 course',
    });
    expect(figureWordsOf(figure('PRACTISED', 31), 'LEARNER', 0).under).toBe('right again, days later');
    expect(figureWordsOf(figure('MASTERED', 2), 'LEARNER', 0).under).toBe('right once more, or a merged fix');
    expect(figureWordsOf(figure('HELPED', 4), 'CONTRIBUTOR', 6)).toMatchObject({
      label: 'said a fix helped',
      under: 'maintainers and readers',
    });
  });

  it('says what a day counts by the kind of page', () => {
    const day = figure('DAYS_ACTIVE', 1);
    expect(figureWordsOf(day, 'CONTRIBUTOR', 1)).toMatchObject({ label: 'day active', under: 'with work on a fix' });
    expect(figureWordsOf(day, 'LEARNER', 0).under).toBe('with a lesson or a review');
    expect(figureWordsOf(day, 'BOTH', 1).under).toBe('with a fix or a lesson');
  });

  it('names the agent in plain type, with the other agent or "for this fix"', () => {
    expect(figureWordsOf(figure('AGENT', null, { name: 'Claude Code', also: 'Codex' }), 'CONTRIBUTOR', 6)).toEqual({
      value: 'Claude Code',
      mono: false,
      label: 'AI agent used',
      under: 'also Codex',
    });
    expect(figureWordsOf(figure('AGENT', null, { name: 'Claude Code' }), 'CONTRIBUTOR', 1).under).toBe('for this fix');
    expect(figureWordsOf(figure('AGENT', null, { name: 'Claude Code' }), 'CONTRIBUTOR', 3).under).toBeNull();
  });

  it('leaves the line under a count out with nothing to count it in', () => {
    expect(figureWordsOf(figure('FIXES_MERGED', 2), 'CONTRIBUTOR', 2).under).toBeNull();
  });
});

describe('listWords and monthOf', () => {
  it('lists with "and"', () => {
    expect(listWords([])).toBe('');
    expect(listWords(['Go'])).toBe('Go');
    expect(listWords(['Go', 'Python'])).toBe('Go and Python');
    expect(listWords(['Go', 'Python', 'TypeScript'])).toBe('Go, Python and TypeScript');
  });

  it('names the month in UTC, and nothing for a time it cannot read', () => {
    expect(monthOf('2026-06-30T23:30:00Z')).toBe('June 2026');
    expect(monthOf('soon')).toBeNull();
  });
});

describe('sinceLineOf', () => {
  it('words a contributor with Contribute, three languages at most', () => {
    expect(sinceLineOf(contributorNumbers)).toEqual([
      'With ',
      { product: 'CONTRIBUTE' },
      ' since June 2026: fixes in Go, Python and TypeScript, in real open-source projects.',
    ]);
    expect(sinceLineOf({ ...contributorNumbers, languages: ['Go', 'Rust', 'C', 'Zig'] })[2]).toContain(
      'in Go, Rust and C,',
    );
  });

  it('words one fix in the singular', () => {
    expect(sinceLineOf(firstFixNumbers)[2]).toBe(' since November 2026: a fix in Go, in a real open-source project.');
  });

  it('names Learn for a contributor whose fixes were all made with it', () => {
    expect(sinceLineOf({ ...contributorNumbers, made: ['LEARN'] })[1]).toEqual({ product: 'LEARN' });
    expect(sinceLineOf({ ...contributorNumbers, made: ['LEARN', 'CONTRIBUTE'] })[1]).toEqual({ product: 'CONTRIBUTE' });
  });

  it('words a learner and a person of both', () => {
    expect(sinceLineOf(learnerNumbers)).toEqual([
      'Learned on ',
      { product: 'LEARN' },
      ' since June 2026: short lessons with a question to answer, then fixes in real open-source projects.',
    ]);
    expect(sinceLineOf(bothNumbers)).toEqual([
      'With GitRanks since June 2026: fixes in real open-source projects with ',
      { product: 'CONTRIBUTE' },
      ', lessons and practice with ',
      { product: 'LEARN' },
      '.',
    ]);
  });

  it('leaves "since" out for a time it cannot read', () => {
    expect(sinceLineOf({ ...contributorNumbers, since: '' })[2]).toBe(
      ': fixes in Go, Python and TypeScript, in real open-source projects.',
    );
  });
});

describe('withoutLearnOf and numbersFor', () => {
  it('leaves Learn’s figures and the days that count lessons out, and reads the rest as Contribute’s', () => {
    const both = withoutLearnOf(bothNumbers);
    expect(both.kind).toBe('CONTRIBUTOR');
    expect(both.figures.map((one) => one.key)).toEqual(['FIXES_MERGED']);
    expect(both.blockFigures.map((one) => one.key)).toEqual(['FIXES_MERGED']);
    expect(both.courses).toBe(0);
    expect(both.made).toEqual(['CONTRIBUTE']);
    expect(sinceLineOf(both)[1]).toEqual({ product: 'CONTRIBUTE' });
  });

  it('keeps a contributor’s days, and no figure of a learner', () => {
    expect(withoutLearnOf(contributorNumbers).figures).toEqual(contributorNumbers.figures);
    expect(withoutLearnOf(learnerNumbers).figures).toEqual([]);
    expect(withoutLearnOf(learnerNumbers).blockFigures).toEqual([]);
  });

  it('changes nothing while Learn is open', () => {
    expect(numbersFor(bothNumbers, true)).toBe(bothNumbers);
  });
});

describe('dayWordsOf', () => {
  it('writes the year only when it is not now’s, in UTC', () => {
    expect(dayWordsOf('2026-11-20T15:00:00Z', SKILLS_NOW)).toBe('20 Nov');
    expect(dayWordsOf('2025-12-31T23:30:00Z', SKILLS_NOW)).toBe('31 Dec 2025');
    expect(dayWordsOf(null, SKILLS_NOW)).toBeNull();
    expect(dayWordsOf('soon', SKILLS_NOW)).toBeNull();
  });
});
