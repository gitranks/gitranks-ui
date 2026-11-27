import { describe, expect, it } from 'vitest';

import {
  buildGoldOpen,
  buildInProgress,
  buildTestLeft,
  codingAgentInProgress,
  keyValueDatabaseEndTest,
  keyValueDatabaseInProgress,
  webServerBuilt,
  webServerGoldTest,
} from './__fixtures__/builds';
import { jsonParserBuiltPlain, webServerBuiltMarked } from './__fixtures__/home';
import { codingAgentCard, interpreterCard } from './__fixtures__/projects';
import { BUILD_CARD_PROMO, type BuildCardSide, buildCardOf } from './home-card';
import type { BuildHome } from './types';

const home = (fields: Partial<BuildHome> = {}): BuildHome => ({ builds: [], tests: [], next: [], ...fields });
const side = (fields: Partial<BuildCardSide> = {}): BuildCardSide => ({
  home: home(),
  builds: [],
  hasBuild: true,
  ...fields,
});

describe("Build's card in the home page's block", () => {
  it('promotes Build, with "New", to a visitor, to someone with no build, and when nothing was read', () => {
    expect(buildCardOf(null)).toEqual(BUILD_CARD_PROMO);
    expect(buildCardOf(side({ hasBuild: false }))).toEqual(BUILD_CARD_PROMO);
    expect(buildCardOf({ home: null, builds: null, hasBuild: null })).toEqual(BUILD_CARD_PROMO);
    expect(BUILD_CARD_PROMO).toMatchObject({
      title: 'Build a real thing, step by step',
      line: 'Pick a project, like an MCP server or a key-value database. Your coding agent writes it with you, one step at a time.',
      action: 'Start building',
      href: '/build',
      isNew: true,
    });
  });

  it('says a test waits first, whatever else is true', () => {
    const card = buildCardOf(
      side({ home: home({ builds: [buildInProgress], tests: [webServerGoldTest, keyValueDatabaseEndTest] }) }),
    );
    expect(card).toEqual({
      title: 'Your test is waiting',
      line: 'Build a key-value database: 10 questions, about 3 minutes.',
      action: 'Take the test',
      href: '/build/key-value-database/test?language=python',
      isNew: false,
      personal: true,
    });
  });

  it('says the gold test is open next', () => {
    const card = buildCardOf(side({ home: home({ builds: [buildInProgress], tests: [webServerGoldTest] }) }));
    expect(card).toMatchObject({
      title: 'Your gold test is open',
      line: 'Build a web server: 10 questions, and 8 right earns the gold mark.',
      action: 'Take the gold test',
      href: '/build/web-server/test/gold?language=typescript',
      isNew: false,
    });
  });

  it('says the build touched last and its next step, with the sentence to say', () => {
    expect(buildCardOf(side({ home: home({ builds: [buildInProgress] }) }))).toMatchObject({
      title: 'Build an MCP server: step 9 of 16',
      line: 'Next: Check the input. Say “Continue my build” in your agent.',
      action: 'Open your build',
      href: '/build/mcp-server',
    });
  });

  it('names how many more builds are in progress, and leads to all of them', () => {
    const two = buildCardOf(side({ home: home({ builds: [buildInProgress, keyValueDatabaseInProgress] }) }));
    expect(two).toMatchObject({
      title: 'Build an MCP server: step 9 of 16',
      line: 'Next: Check the input. And 1 more build in progress.',
      action: 'Open your builds',
      href: '/build/mine',
    });
    const three = buildCardOf(
      side({ home: home({ builds: [buildInProgress, keyValueDatabaseInProgress, codingAgentInProgress] }) }),
    );
    expect(three.line).toBe('Next: Check the input. And 2 more builds in progress.');
  });

  it('passes over a build with the test left that no waiting test names', () => {
    expect(buildCardOf(side({ home: home({ builds: [buildTestLeft, keyValueDatabaseInProgress] }) })).title).toBe(
      'Build a key-value database: step 3 of 14',
    );
  });

  it('counts the projects built, each once, and names the next one to pick', () => {
    const card = buildCardOf(
      side({
        home: home({ next: [codingAgentCard, interpreterCard] }),
        builds: [webServerBuiltMarked, jsonParserBuiltPlain, { ...webServerBuilt, language: 'python', build: 'b-2' }],
      }),
    );
    expect(card).toMatchObject({
      title: '2 projects built',
      line: 'Next for you: Build a coding agent.',
      action: 'Pick your next project',
      href: '/build/projects',
      isNew: false,
    });
    expect(buildCardOf(side({ builds: [buildGoldOpen] })).title).toBe('1 project built');
  });

  it('says every project is built when none is left to pick', () => {
    expect(buildCardOf(side({ builds: [buildGoldOpen] }))).toMatchObject({
      line: 'You built every project there is so far.',
      action: 'Open your builds',
      href: '/build/mine',
    });
  });

  it('keeps the promotion without "New" for someone with a build when nothing more can be said', () => {
    const quiet = { ...BUILD_CARD_PROMO, action: 'Open Build', isNew: false };
    expect(buildCardOf(side({ home: null }))).toEqual(quiet);
    expect(buildCardOf(side({ builds: null }))).toEqual(quiet);
    expect(buildCardOf(side({ home: home({ builds: [buildTestLeft] }), builds: [buildTestLeft] }))).toEqual(quiet);
  });

  it('never shows a zero', () => {
    const sides = [
      side({ home: home({ builds: [buildInProgress] }) }),
      side({ home: home({ builds: [buildInProgress, keyValueDatabaseInProgress] }) }),
      side({ builds: [buildGoldOpen] }),
      side({ home: home({ tests: [keyValueDatabaseEndTest] }) }),
    ];
    for (const value of sides) {
      const card = buildCardOf(value);
      expect(`${card.title} ${card.line}`).not.toMatch(/\b0\b/);
    }
  });
});
