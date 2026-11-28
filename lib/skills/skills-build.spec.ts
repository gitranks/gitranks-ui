import { describe, expect, it, vi } from 'vitest';

import {
  allThreeNumbers,
  allThreePage,
  bothNumbers,
  builderNumbers,
  builderPage,
  buildsAndFixesNumbers,
  buildsAndLearnsNumbers,
  builtKeyValue,
  builtMcpServer,
  builtWebServer,
  builtWebServerGold,
  contributorNumbers,
  contributorPage,
  SKILLS_NOW,
} from './__fixtures__/skills';
import type { SkillsFigure, SkillsKind } from './skills.types';
import { builtLanguagesOf, builtLineOf, builtRowOf } from './skills-built';
import {
  countsBuildsOf,
  figureWordsOf,
  type LinePart,
  PRODUCT_NAMES,
  shownFigures,
  sinceLineOf,
} from './skills-figures';
import { skillsMarkdownOf } from './skills-markdown';
import { skillsCardOf, skillsCardSentenceOf } from './skills-share-card';

// The site's address is read once, as the module loads: vitest runs this before the imports.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const LONG_DASH = String.fromCodePoint(0x2014);

/** A line as the page reads it, each product by its name. */
const textOf = (parts: readonly LinePart[]) =>
  parts.map((part) => (typeof part === 'string' ? part : PRODUCT_NAMES[part.product])).join('');

const figure = (key: SkillsFigure['key'], value: number | null, extra: Partial<SkillsFigure> = {}): SkillsFigure => ({
  key,
  value,
  second: null,
  name: null,
  also: null,
  ...extra,
});

describe('a Built row', () => {
  it('names the thing, its languages, steps and parts, the marks gold first, the day, and the project', () => {
    expect(builtRowOf(builtMcpServer, SKILLS_NOW)).toEqual({
      facts: ['TypeScript', '16 steps', '2 of 5 optional parts'],
      thing: 'An MCP server',
      line: 'A small program that gives an AI agent new tools, written from nothing with no library.',
      marks: ['gold', 'answered'],
      built: 'built 20 Nov',
      href: '/build/mcp-server',
    });
  });

  it('is one row for both languages, named together, and has no mark without one', () => {
    const row = builtRowOf(builtKeyValue, SKILLS_NOW);
    expect(row.facts).toEqual(['TypeScript and Python', '14 steps']);
    expect(row.marks).toEqual([]);
    expect(builtRowOf(builtWebServer, SKILLS_NOW).marks).toEqual(['answered']);
    expect(builtRowOf(builtWebServerGold, SKILLS_NOW).marks).toEqual(['gold']);
  });

  it('never counts nothing: no parts, no steps, no day it cannot read', () => {
    const row = builtRowOf({ ...builtMcpServer, steps: 0, parts: 0, builtAt: 'soon' }, SKILLS_NOW);
    expect(row.facts).toEqual(['TypeScript']);
    expect(row.built).toBeNull();
    expect(builtRowOf({ ...builtMcpServer, parts: 1, partsOf: 1 }, SKILLS_NOW).facts).toContain('1 of 1 optional part');
    expect(builtRowOf({ ...builtMcpServer, steps: 1 }, SKILLS_NOW).facts).toContain('1 step');
    expect(builtRowOf({ ...builtMcpServer, builtAt: '2025-12-02T10:00:00Z' }, SKILLS_NOW).built).toBe(
      'built 2 Dec 2025',
    );
  });

  it('keeps the name of a language the site does not know', () => {
    expect(builtLanguagesOf(['typescript', 'go'])).toBe('TypeScript and go');
  });

  it('says under the heading how each project was made, naming GitRanks Build', () => {
    expect(textOf(builtLineOf('octocat'))).toBe(
      'Made with GitRanks Build: an AI agent wrote each project one small step at a time, and octocat passed a test on it alone at the end.',
    );
  });
});

describe('the figure "projects built" and the kind BUILDER', () => {
  it('words the figure, with how many were repeated after a week under it, and no zero', () => {
    expect(figureWordsOf(figure('PROJECTS_BUILT', 3, { second: 1 }), 'BUILDER', 0)).toEqual({
      value: '3',
      mono: true,
      label: 'projects built',
      under: '1 repeated after a week',
    });
    expect(figureWordsOf(figure('PROJECTS_BUILT', 1), 'BOTH', 2, true)).toMatchObject({
      label: 'project built',
      under: null,
    });
    expect(figureWordsOf(figure('PROJECTS_BUILT', 2, { second: 0 }), 'BOTH', 2, true).under).toBeNull();
  });

  it('words every figure for every kind without throwing', () => {
    const keys: SkillsFigure['key'][] = [
      'FIXES_MERGED',
      'PULL_REQUESTS_OPEN',
      'LESSONS_LEARNED',
      'PRACTISED',
      'MASTERED',
      'DAYS_ACTIVE',
      'HELPED',
      'AGENT',
      'PROJECTS_BUILT',
    ];
    const kinds: SkillsKind[] = ['CONTRIBUTOR', 'LEARNER', 'BOTH', 'BUILDER'];
    for (const key of keys) {
      for (const kind of kinds) {
        for (const builds of [false, true]) {
          const words = figureWordsOf(figure(key, 2, { second: 1, name: 'Codex' }), kind, 1, builds);
          expect(words.label, `${key} ${kind}`).toBeTruthy();
          expect(words.under ?? '').not.toContain('undefined');
        }
      }
    }
  });

  it('counts the days of a builder by the steps of a build, and of someone who also builds by all three', () => {
    const days = figure('DAYS_ACTIVE', 21);
    expect(figureWordsOf(days, 'BUILDER', 0, true).under).toBe('with a step of a build');
    expect(figureWordsOf(days, 'BUILDER', 0).under).toBe('with a step of a build');
    for (const kind of ['CONTRIBUTOR', 'LEARNER', 'BOTH'] as const) {
      expect(figureWordsOf(days, kind, 3, true).under).toBe('with a fix, a step or a lesson');
    }
    expect(figureWordsOf(days, 'CONTRIBUTOR', 3).under).toBe('with work on a fix');
  });

  it('knows numbers count builds only for a builder or a row with projects built in it', () => {
    expect(countsBuildsOf(builderNumbers)).toBe(true);
    expect(countsBuildsOf(allThreeNumbers)).toBe(true);
    expect(countsBuildsOf(bothNumbers)).toBe(false);
    expect(countsBuildsOf({ ...bothNumbers, figures: [figure('PROJECTS_BUILT', 0)] })).toBe(false);
  });
});

describe('the line under the numbers, with builds', () => {
  it('for each kind of person, names only the products they use', () => {
    expect(textOf(sinceLineOf(builderNumbers))).toBe(
      'Built with GitRanks Build since November 2026: real, small projects made one step at a time with an AI agent, each with a test passed at the end.',
    );
    expect(textOf(sinceLineOf({ ...buildsAndLearnsNumbers, fixes: 0, made: [] }))).toBe(
      'With GitRanks since June 2026: projects built with GitRanks Build, lessons and practice with GitRanks Learn.',
    );
    expect(textOf(sinceLineOf(buildsAndLearnsNumbers))).toBe(
      'With GitRanks since June 2026: fixes in real open-source projects with GitRanks Learn, projects built with GitRanks Build, lessons and practice with GitRanks Learn.',
    );
    expect(textOf(sinceLineOf(buildsAndFixesNumbers))).toBe(
      'With GitRanks since June 2026: fixes in real open-source projects with GitRanks Contribute, projects built with GitRanks Build.',
    );
    expect(textOf(sinceLineOf(allThreeNumbers))).toBe(
      'With GitRanks since June 2026: fixes in real open-source projects with GitRanks Contribute, projects built with GitRanks Build, lessons and practice with GitRanks Learn.',
    );
  });

  it("is today's line while the row counts no build", () => {
    expect(sinceLineOf(contributorNumbers)).not.toContainEqual({ product: 'BUILD' });
    expect(sinceLineOf(bothNumbers)).not.toContainEqual({ product: 'BUILD' });
  });
});

describe('the share picture and the Markdown copy of a page with builds', () => {
  it("says a sentence about a builder, and draws the block's figures", () => {
    expect(skillsCardSentenceOf('BUILDER')).toBe('builds real projects with an AI agent, one step at a time');
    expect(skillsCardOf(builderPage)?.figures.map((one) => one.label)).toEqual([
      'projects built',
      'days active',
      'AI agent used',
    ]);
  });

  it('words the numbers and their line, links GitRanks Build, and lists each Built row as the page does', () => {
    for (const page of [builderPage, allThreePage]) {
      const text = skillsMarkdownOf(page, { now: SKILLS_NOW });
      expect(text).toContain('projects built');
      expect(text).toContain('[GitRanks Build](https://gitranks.com/build)');
      expect(text).not.toContain(LONG_DASH);
      expect(text.toLowerCase()).not.toContain('claim');
      for (const row of page.built ?? []) expect(text).toContain(row.line);
    }
    const text = skillsMarkdownOf(builderPage, { now: SKILLS_NOW });
    expect(text).toContain(
      '## Built\n\nMade with [GitRanks Build](https://gitranks.com/build): an AI agent wrote each project one small step at a time, and octocat passed a test on it alone at the end.\n\n',
    );
    expect(text).toContain(
      '- [An MCP server](https://gitranks.com/build/mcp-server) · TypeScript · 16 steps · 2 of 5 optional parts · Repeated after a week · Answered every step · built 20 Nov\n  A small program that gives an AI agent new tools, written from nothing with no library.',
    );
    expect(text).toContain(
      '- [A key-value database](https://gitranks.com/build/key-value-database) · TypeScript and Python · 14 steps · built 3 Nov\n  Set, get and delete, kept on disk through a restart.',
    );
  });

  it('puts Built between the fixes and the courses, and leaves it out with no built project', () => {
    const text = skillsMarkdownOf(allThreePage, { now: SKILLS_NOW });
    const fixes = text.indexOf('## Fixes in real projects');
    const built = text.indexOf('## Built');
    const courses = text.indexOf('## Courses');
    expect(fixes).toBeGreaterThan(-1);
    expect(built).toBeGreaterThan(fixes);
    expect(courses).toBeGreaterThan(built);
    expect(text).not.toContain(builtKeyValue.line);
    expect(skillsMarkdownOf(contributorPage, { now: SKILLS_NOW })).not.toContain('## Built');
    expect(skillsMarkdownOf({ ...builderPage, built: [] }, { now: SKILLS_NOW })).not.toContain('## Built');
  });
});

describe('a figure the site does not know yet', () => {
  it('is left out of the row and said once, so the next figure the API adds never fails a page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unknown = figure('SOMETHING_NEW' as SkillsFigure['key'], 4);
    const row = [figure('DAYS_ACTIVE', 3), unknown];
    expect(shownFigures(row)).toEqual([row[0]]);
    expect(shownFigures(row)).toEqual([row[0]]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(skillsCardOf({ login: 'octocat', numbers: { ...builderNumbers, blockFigures: row } })?.figures).toHaveLength(
      1,
    );
    warn.mockRestore();
  });
});
