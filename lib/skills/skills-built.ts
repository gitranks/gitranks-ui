import type { Route } from 'next';

import type { SkillsBuilt } from './skills.types';
import { countOf, dayWordsOf, type LinePart, listWords } from './skills-figures';
import { buildProjectPath } from '@/lib/build/paths';
import { type BuildCardMark, LANGUAGE_NAMES } from '@/lib/build/project-card';
import { isBuildLanguage } from '@/lib/build/types';

/*
 * The "Built" section of a Skills page: one row for each project the person built with GitRanks Build, both languages
 * in one row. Pure, from the API's rows alone. No zero: a count of nothing is left out of the row.
 */

/** What a Built row draws. */
export type BuiltRowWords = {
  /** The languages, the steps and the optional parts built, each left out with nothing in it. */
  facts: string[];
  /** What was built, as a heading names it: "An MCP server". */
  thing: string;
  line: string;
  /** The marks, gold first. */
  marks: BuildCardMark[];
  /** "built 26 Nov"; null for a day that cannot be read. */
  built: string | null;
  /** The project's page, which the title and the button lead to. */
  href: Route;
};

const plural = (value: number, one: string, many: string) => `${countOf(value)} ${value === 1 ? one : many}`;

/** "TypeScript", "TypeScript and Python": a language the site does not know keeps the API's name. */
export const builtLanguagesOf = (languages: readonly string[]) =>
  listWords(languages.map((language) => (isBuildLanguage(language) ? LANGUAGE_NAMES[language] : language)));

/** A row's words. */
export function builtRowOf(row: SkillsBuilt, now: Date): BuiltRowWords {
  const languages = builtLanguagesOf(row.languages);
  const facts = [
    languages,
    row.steps > 0 ? plural(row.steps, 'step', 'steps') : '',
    row.parts > 0 && row.partsOf > 0
      ? `${countOf(row.parts)} of ${plural(row.partsOf, 'optional part', 'optional parts')}`
      : '',
  ].filter(Boolean);
  const thing = row.thing.trim();
  const marks: BuildCardMark[] = [];
  if (row.gold) marks.push('gold');
  if (row.answeredAll) marks.push('answered');
  const day = dayWordsOf(row.builtAt, now);
  return {
    facts,
    thing: thing.charAt(0).toUpperCase() + thing.slice(1),
    line: row.line.trim(),
    marks,
    built: day ? `built ${day}` : null,
    href: buildProjectPath(row.project),
  };
}

/** The line under the heading: how each project was made. */
export const builtLineOf = (login: string): LinePart[] => [
  'Made with ',
  { product: 'BUILD' },
  `: an AI agent wrote each project one small step at a time, and ${login} passed a test on it alone at the end.`,
];
