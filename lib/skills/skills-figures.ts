import type { SkillsFigure, SkillsKind, SkillsNumbers } from './skills.types';
import type { LearnFixMade } from '@/lib/workspace/pull-request-page.types';

/*
 * The numbers box's words: each figure's number, its label and the line under it, and the line under the row. Pure,
 * so the tab, the block and the share card word a figure the same way.
 */

const COUNT = new Intl.NumberFormat('en-US');

/** `1,234`. */
export const countOf = (value: number) => COUNT.format(value);

/** "1 project", "5 projects". */
const counted = (value: number, one: string, many: string) => `${countOf(value)} ${value === 1 ? one : many}`;

/** "in 5 projects"; null with nothing to count. */
const inOf = (value: number | null, one: string, many: string) =>
  value !== null && value > 0 ? `in ${counted(value, one, many)}` : null;

/**
 * Whether a figure has something in it: a number above zero, or the agent's name. A figure with nothing in it is left
 * out, so no number on the page is ever a zero.
 */
export function hasSomething(figure: SkillsFigure): boolean {
  if (figure.key === 'AGENT') return !!figure.name?.trim();
  return figure.value !== null && figure.value > 0;
}

/** The figures worth showing, in their order: the row is shorter, it never holds a hole. */
export const shownFigures = (figures: readonly SkillsFigure[]) => figures.filter(hasSomething);

/** What a contributor's, a learner's and a person's of both days count. */
const DAYS_UNDER: Record<SkillsKind, string> = {
  CONTRIBUTOR: 'with work on a fix',
  LEARNER: 'with a lesson or a review',
  BOTH: 'with a fix or a lesson',
};

/** A figure as the box draws it: the big text, its label, and the small line under it. */
export type FigureWords = { value: string; mono: boolean; label: string; under: string | null };

/**
 * A figure's words. `fixes` is how many fixes the page lists: the agent of a person with one fix is "for this fix".
 * Singular for one: "1 fix merged", "in 1 project", "1 lesson learned", "1 day active".
 */
export function figureWordsOf(figure: SkillsFigure, kind: SkillsKind, fixes: number): FigureWords {
  const value = figure.value ?? 0;
  const second = figure.second;
  const number = (label: string, under: string | null = null): FigureWords => ({
    value: countOf(value),
    mono: true,
    label,
    under,
  });
  switch (figure.key) {
    case 'FIXES_MERGED':
      return number(value === 1 ? 'fix merged' : 'fixes merged', inOf(second, 'project', 'projects'));
    case 'PULL_REQUESTS_OPEN':
      return number(value === 1 ? 'pull request open' : 'pull requests open', inOf(second, 'project', 'projects'));
    case 'LESSONS_LEARNED':
      return number(value === 1 ? 'lesson learned' : 'lessons learned', inOf(second, 'course', 'courses'));
    case 'PRACTISED':
      return number('practised', 'right again, days later');
    case 'MASTERED':
      return number('mastered', 'right once more, or a merged fix');
    case 'DAYS_ACTIVE':
      return number(value === 1 ? 'day active' : 'days active', DAYS_UNDER[kind]);
    case 'HELPED':
      return number('said a fix helped', 'maintainers and readers');
    case 'AGENT': {
      const also = figure.also?.trim();
      return {
        value: figure.name?.trim() ?? '',
        mono: false,
        label: 'AI agent used',
        under: also ? `also ${also}` : fixes === 1 ? 'for this fix' : null,
      };
    }
  }
}

/** "Go", "Go and Python", "Go, Python and TypeScript". */
export function listWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "June 2026"; null for a time that cannot be read. */
export function monthOf(at: string): string | null {
  const when = new Date(at);
  return Number.isNaN(when.getTime()) ? null : MONTH.format(when);
}

/** A part of the line under the numbers: words, or a product's name, which is a link to its landing. */
export type LinePart = string | { product: LearnFixMade };

/**
 * The line under the numbers, by kind: since when, with which product, and what. A contributor whose fixes were all
 * made with Learn is "With GitRanks Learn". Three languages at most, as the API sends them.
 */
export function sinceLineOf(
  numbers: Pick<SkillsNumbers, 'kind' | 'since' | 'languages' | 'fixes'>,
  made: readonly LearnFixMade[] = [],
): LinePart[] {
  const month = monthOf(numbers.since);
  const since = month ? ` since ${month}` : '';
  if (numbers.kind === 'LEARNER') {
    return [
      'Learned on ',
      { product: 'LEARN' },
      `${since}: short lessons with a question to answer, then fixes in real open-source projects.`,
    ];
  }
  if (numbers.kind === 'BOTH') {
    return [
      `With GitRanks${since}: fixes in real open-source projects with `,
      { product: 'CONTRIBUTE' },
      ', lessons and practice with ',
      { product: 'LEARN' },
      '.',
    ];
  }
  const product: LearnFixMade = made.length > 0 && made.every((one) => one === 'LEARN') ? 'LEARN' : 'CONTRIBUTE';
  const languages = numbers.languages.slice(0, 3);
  const inLanguages = languages.length ? ` in ${listWords(languages)}` : '';
  const what =
    numbers.fixes === 1
      ? `a fix${inLanguages}, in a real open-source project.`
      : `fixes${inLanguages}, in real open-source projects.`;
  return ['With ', { product }, `${since}: ${what}`];
}

/** A product's name as the page writes it. */
export const PRODUCT_NAMES: Record<LearnFixMade, string> = {
  CONTRIBUTE: 'GitRanks Contribute',
  LEARN: 'GitRanks Learn',
};
