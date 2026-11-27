import type { BuildProjectCard } from '../types';

/*
 * The projects as the approved designs show them: the five cards of the list at the start, and the sixth of the board
 * with more projects than Home lists. Names, lines and numbers are the boards'.
 */

/** The day the boards are drawn on: "today" in every fixture. */
export const BUILD_FIXTURE_NOW = '2026-11-26T12:00:00.000Z';

const card = (fields: Omit<BuildProjectCard, 'tags' | 'languages' | 'needs'> & Partial<BuildProjectCard>) =>
  ({
    tags: [],
    languages: ['typescript', 'python'],
    needs: ['Node 22 or newer, or Python 3.12 or newer', 'An agent with a shell'],
    ...fields,
  }) satisfies BuildProjectCard;

/** The first project, as a card. */
export const mcpServerCard = card({
  slug: 'mcp-server',
  name: 'Build an MCP server',
  thing: 'an MCP server',
  line: 'A small program that gives your AI agent new tools.',
  level: 1,
  subject: 'ai',
  tags: ['mcp', 'agents', 'json-rpc'],
  minutes: 90,
  baseSteps: 16,
  parts: 1,
});

export const codingAgentCard = card({
  slug: 'coding-agent',
  name: 'Build a coding agent',
  thing: 'a coding agent',
  line: 'An agent that reads files, edits them and runs commands.',
  level: 2,
  subject: 'ai',
  minutes: 120,
  baseSteps: 18,
  parts: 0,
});

export const interpreterCard = card({
  slug: 'interpreter',
  name: 'Build an interpreter',
  thing: 'an interpreter',
  line: 'A small language of your own: numbers, names and functions.',
  level: 2,
  subject: 'languages',
  minutes: 120,
  baseSteps: 20,
  parts: 0,
});

export const keyValueDatabaseCard = card({
  slug: 'key-value-database',
  name: 'Build a key-value database',
  thing: 'a key-value database',
  line: 'Set, get and delete, kept on disk through a restart.',
  level: 1,
  subject: 'data',
  minutes: 90,
  baseSteps: 14,
  parts: 0,
});

export const webServerCard = card({
  slug: 'web-server',
  name: 'Build a web server',
  thing: 'a web server',
  line: 'From a raw socket to pages in your browser.',
  level: 1,
  subject: 'web',
  minutes: 90,
  baseSteps: 15,
  parts: 0,
});

export const gitCard = card({
  slug: 'git',
  name: 'Build Git',
  thing: 'Git',
  line: 'Commits, branches and history, on a folder of your own.',
  level: 2,
  subject: 'tools',
  minutes: 150,
  baseSteps: 22,
  parts: 0,
});

/** A project the boards name only among built ones (My builds). */
export const jsonParserCard = card({
  slug: 'json-parser',
  name: 'Build a JSON parser',
  thing: 'a JSON parser',
  line: 'Read any JSON text into values your program can use.',
  level: 1,
  subject: 'languages',
  minutes: 75,
  baseSteps: 12,
  parts: 0,
});

/** The list at the start: five projects, in our order. */
export const buildProjectsFew: BuildProjectCard[] = [
  mcpServerCard,
  codingAgentCard,
  interpreterCard,
  keyValueDatabaseCard,
  webServerCard,
];

/** More projects than Home lists (six at the most). */
export const buildProjectsMany: BuildProjectCard[] = [...buildProjectsFew, gitCard, jsonParserCard];
