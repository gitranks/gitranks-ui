import { describe, expect, it } from 'vitest';

import { buildProjectsFourteen } from './__fixtures__/home';
import { buildProjectsFew, buildProjectsMany } from './__fixtures__/projects';
import { isGroupedList, matchesSearch, PROJECTS_GROUPED_FROM, projectsCountOf, projectsSearchOf } from './projects';

describe('The list of projects', () => {
  it('is grouped, with a search, from nine projects on', () => {
    expect(PROJECTS_GROUPED_FROM).toBe(9);
    expect(isGroupedList(buildProjectsFew)).toBe(false);
    expect(isGroupedList(buildProjectsMany)).toBe(false);
    expect(isGroupedList(buildProjectsFourteen)).toBe(true);
  });

  it('groups by subject in the groups order, each keeping our order inside', () => {
    const search = projectsSearchOf(buildProjectsFourteen, '');
    expect(search.groups.map((group) => group.name)).toEqual(['AI', 'Languages', 'Data', 'The web', 'Tools']);
    expect(search.groups[0].cards.map((card) => card.slug)).toEqual([
      'mcp-server',
      'coding-agent',
      'notes-search',
      'tokenizer',
    ]);
    expect(search.shown).toBe(14);
    expect(projectsCountOf(search)).toBe('14 projects');
  });

  it('finds by the name and the line, and leaves out a group with no match', () => {
    const search = projectsSearchOf(buildProjectsFourteen, '  server ');
    expect(search.query).toBe('server');
    expect(search.groups.map((group) => group.name)).toEqual(['AI', 'The web']);
    expect(projectsCountOf(search)).toBe('2 of 14 shown');
    expect(projectsSearchOf(buildProjectsFourteen, 'restart').groups.map((group) => group.cards[0].slug)).toEqual([
      'key-value-database',
    ]);
    expect(matchesSearch(buildProjectsFourteen[0], 'MCP tools')).toBe(true);
  });

  it('counts nothing when nothing matches: never a zero', () => {
    const search = projectsSearchOf(buildProjectsFourteen, 'kubernetes');
    expect(search.groups).toEqual([]);
    expect(search.shown).toBe(0);
    expect(projectsCountOf(search)).toBe('');
  });

  it('says one project in the singular', () => {
    expect(projectsCountOf(projectsSearchOf(buildProjectsFew.slice(0, 1), ''))).toBe('1 project');
  });
});
