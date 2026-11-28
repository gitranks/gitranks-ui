import { describe, expect, it } from 'vitest';

import { mcpServerCourseFacts } from './__fixtures__/courses';
import { mcpServerProject } from './__fixtures__/project';
import { courseDoorLineOf, courseRowsOf, lessonsWordsOf } from './project-courses';

describe('courseRowsOf', () => {
  it("gives each of the project's courses its line and lessons, in the project's order", () => {
    expect(courseRowsOf(mcpServerProject, [...mcpServerCourseFacts].reverse())).toEqual([
      {
        slug: 'mcp',
        name: 'Building MCP servers and clients',
        line: 'Giving AI apps tools and data over MCP, from messages to publishing',
        lessons: 70,
      },
      {
        slug: 'llm-apis',
        name: 'Working with LLM APIs',
        line: 'Calling a model, tools, streaming and cost',
        lessons: 69,
      },
    ]);
  });

  it('keeps a course the list does not have, and a count that is no count, to its name alone', () => {
    const rows = courseRowsOf(mcpServerProject, [{ slug: 'mcp', covers: ' ', lessons: 0 }]);
    expect(rows.map((row) => [row.line, row.lessons])).toEqual([
      [null, null],
      [null, null],
    ]);
  });
});

describe('the words', () => {
  it('count lessons, and say nothing for a count not known', () => {
    expect(lessonsWordsOf(70)).toBe('70 lessons');
    expect(lessonsWordsOf(1)).toBe('1 lesson');
    expect(lessonsWordsOf(null)).toBeNull();
  });

  it('give "Go deeper" the count when it is known', () => {
    const [mcp] = courseRowsOf(mcpServerProject, mcpServerCourseFacts);
    expect(courseDoorLineOf(mcp)).toBe('A Learn course · 70 lessons');
    expect(courseDoorLineOf({ slug: 'x', name: 'X', line: null, lessons: null })).toBe('A Learn course');
    expect(courseDoorLineOf(undefined)).toBe('A Learn course');
  });
});
