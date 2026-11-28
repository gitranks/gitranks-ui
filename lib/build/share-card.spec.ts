import { describe, expect, it, vi } from 'vitest';

import { mcpServerProject } from './__fixtures__/project';
import { listTheToolsStep } from './__fixtures__/step';
import { buildProjectMetadata } from './project-seo';
import { buildShareUrlOf, githubWordsOf, thingNameOf } from './project-share';
import { BUILD_HOME_METADATA } from './seo';
import {
  BUILD_HOME_CARD_URL,
  type BuildSharedRow,
  builtRowFor,
  HOME_CARD,
  personCardOf,
  personCardUrlOf,
  personPreviewOf,
  projectCardOf,
  projectCardUrlOf,
  stepCardOf,
  stepCardUrlOf,
} from './share-card';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

/** The first project as octocat's public Skills page lists it, repeated after a week. */
const built: BuildSharedRow = {
  project: 'mcp-server',
  thing: 'an MCP server',
  languages: ['typescript'],
  steps: 16,
  builtAt: '2026-11-26T10:00:00Z',
  gold: true,
};

describe("a person's build", () => {
  it('reads as the board: who built what, how, when, and the gold mark when earned', () => {
    expect(personCardOf(mcpServerProject, 'octocat', built)).toEqual({
      eyebrow: 'Built',
      built: true,
      login: 'octocat',
      title: 'built an MCP server',
      lines: ['In TypeScript, in 16 steps, with their own AI agent', 'Built on 26 Nov 2026 · Repeated after a week'],
      address: 'gitranks.com/build/mcp-server',
    });
    const plain = personCardOf(mcpServerProject, 'octocat', {
      ...built,
      gold: false,
      languages: ['typescript', 'python'],
    });
    expect(plain.lines).toEqual([
      'In TypeScript and Python, in 16 steps, with their own AI agent',
      'Built on 26 Nov 2026',
    ]);
  });

  it('never says zero steps: the base stands in', () => {
    expect(personCardOf(mcpServerProject, 'octocat', { ...built, steps: 0 }).lines[0]).toContain('in 16 steps');
  });

  it('is found only on the Built row of that project', () => {
    expect(builtRowFor([built], 'mcp-server')).toBe(built);
    expect(builtRowFor([built], 'coding-agent')).toBeNull();
    expect(builtRowFor(null, 'mcp-server')).toBeNull();
  });

  it('has a versioned picture under the project, naming the person', () => {
    const url = personCardUrlOf(mcpServerProject, 'octocat', built);
    expect(url).toMatch(/^\/build\/mcp-server\/card\.png\?by=octocat&v=[0-9a-z]+$/);
    expect(personCardUrlOf(mcpServerProject, 'octocat', { ...built, gold: false })).not.toBe(url);
  });

  it("gives the page's preview the build's words, keeping the project as the canonical", () => {
    const metadata = buildProjectMetadata(mcpServerProject, { login: 'octocat', row: built });
    expect(personPreviewOf(mcpServerProject, 'octocat', built).title).toBe(
      'octocat built an MCP server · GitRanks Build',
    );
    expect(metadata.openGraph).toMatchObject({
      title: 'octocat built an MCP server · GitRanks Build',
      description: 'Built step by step with their own AI agent, and repeated a week later. Build one yourself.',
      images: [
        {
          url: `https://example.test${personCardUrlOf(mcpServerProject, 'octocat', built)}`,
          width: 1200,
          height: 630,
          alt: 'octocat built an MCP server',
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(metadata.alternates).toMatchObject({ canonical: '/build/mcp-server' });
  });
});

describe('a project, a step and Build', () => {
  it("a project: its name, line and facts, and the project's picture in its preview", () => {
    expect(projectCardOf(mcpServerProject)).toMatchObject({
      eyebrow: 'Build',
      built: false,
      title: 'Build an MCP server',
      lines: [
        'A small program that gives your AI agent new tools',
        '16 steps · about an hour and a half · TypeScript or Python',
      ],
    });
    const metadata = buildProjectMetadata(mcpServerProject);
    expect(metadata.openGraph).toMatchObject({
      title: 'Build an MCP server · GitRanks Build',
      images: [{ url: `https://example.test${projectCardUrlOf(mcpServerProject)}`, alt: 'Build an MCP server' }],
    });
    expect(projectCardUrlOf(mcpServerProject)).toMatch(/^\/build\/mcp-server\/card\.png\?v=[0-9a-z]+$/);
  });

  it('a step: its place in the label, its name, its project and its own address', () => {
    expect(stepCardOf(listTheToolsStep)).toEqual({
      eyebrow: 'Build · Step 7 of 16',
      built: false,
      login: null,
      title: 'List the tools',
      lines: ['Build an MCP server'],
      address: 'gitranks.com/build/mcp-server/list-the-tools',
    });
    expect(
      stepCardOf({ ...listTheToolsStep, part: { slug: 'official-sdk', name: 'The same server on the official SDK' } })
        .lines,
    ).toEqual(['Build an MCP server', 'Optional part: The same server on the official SDK']);
    expect(stepCardUrlOf(listTheToolsStep)).toMatch(/^\/build\/mcp-server\/list-the-tools\/card\.png\?v=/);
  });

  it("Build's home: the landing's sentence, in its preview", () => {
    expect(HOME_CARD.title).toBe('Build real things with your own AI agent');
    expect(BUILD_HOME_METADATA.openGraph).toMatchObject({
      title: 'GitRanks Build',
      images: [{ url: `https://example.test${BUILD_HOME_CARD_URL}`, width: 1200, height: 630 }],
    });
  });
});

describe('Share and Put it on GitHub', () => {
  it("link to the person's build of the project", () => {
    expect(buildShareUrlOf('mcp-server', 'octocat')).toBe('https://example.test/build/mcp-server?by=octocat');
  });

  it("name the project's slug and the person's login, as the board does", () => {
    expect(thingNameOf('an MCP server')).toBe('MCP server');
    expect(thingNameOf('a coding agent')).toBe('coding agent');
    expect(githubWordsOf(mcpServerProject, 'octocat')).toEqual({
      title: 'Put your MCP server on GitHub',
      say: 'Put this project on GitHub as a new public repository named mcp-server',
      repository: 'mcp-server',
      commands: ['git remote add origin https://github.com/octocat/mcp-server.git', 'git push -u origin main'],
      commit: 'git commit -m "Build an MCP server"',
    });
  });
});
