// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { ProjectView } = await import('./project-view');
const { GithubPanel, SharePanel } = await import('./project-share');
const fixtures = await import('@/lib/build/__fixtures__/project-page');
const { mcpServerCourseFacts } = await import('@/lib/build/__fixtures__/courses');
const { courseRowsOf } = await import('@/lib/build/project-courses');
const { githubWordsOf } = await import('@/lib/build/project-share');
type Side = import('@/lib/build/project').ProjectSide;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Radix's popover measures what it opens next to.
class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoResize;

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

const project = fixtures.mcpServerFiveParts;
const built: Side = { kind: 'person', mine: fixtures.mineBuilt, test: null };
const draw = (node: ReactNode) =>
  act(async () => {
    root.render(node);
  });
const buttonOf = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text);

describe("a built project's Share and Put it on GitHub", () => {
  it('stand under the box once the login is known', async () => {
    await draw(<ProjectView project={project} side={built} login="octocat" />);
    expect(buttonOf('Share')).toBeDefined();
    expect(buttonOf('Put it on GitHub')).toBeDefined();
    await draw(<ProjectView project={project} side={built} />);
    expect(host.querySelector('[data-project-share-actions]')).toBeNull();
  });

  it('are not offered before the project is built', async () => {
    await draw(
      <ProjectView
        project={project}
        side={{ kind: 'person', mine: fixtures.mineTestLeft, test: null }}
        login="octocat"
      />,
    );
    expect(host.querySelector('[data-project-share-actions]')).toBeNull();
  });

  it("Share opens the link to the person's build, with Copy link and no other place to post", async () => {
    await draw(<ProjectView project={project} side={built} login="octocat" />);
    await act(async () => buttonOf('Share')?.click());
    const panel = document.querySelector('[data-build-share]');
    expect(panel?.querySelector('input')?.value).toBe('https://example.test/build/mcp-server?by=octocat');
    expect(panel?.textContent).toContain(
      'Anyone with the link sees the project, and that you built it once your Skills page is public.',
    );
    // The popover is named by its title.
    const popover = document.querySelector('[data-slot="popover-content"]');
    const titleId = popover?.getAttribute('aria-labelledby');
    expect(titleId && document.getElementById(titleId)?.textContent).toBe('Share what you built');
    expect(panel?.textContent).not.toMatch(/\bX\b|LinkedIn/);
    expect(panel?.querySelector('img')?.getAttribute('src')).toBe('/build/mcp-server/card.png?by=octocat');
  });

  it('Put it on GitHub opens the dialog with the sentence and the commands, with Close', async () => {
    await draw(<ProjectView project={project} side={built} login="octocat" />);
    await act(async () => buttonOf('Put it on GitHub')?.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.querySelector('h2')?.textContent).toBe('Put your MCP server on GitHub');
    expect(dialog?.textContent).toContain('Put this project on GitHub as a new public repository named mcp-server');
    expect(dialog?.querySelector('pre')?.textContent).toBe(
      'git remote add origin https://github.com/octocat/mcp-server.git\ngit branch -M main\ngit push -u origin main',
    );
    expect(dialog?.textContent).toContain('git commit -m "Build an MCP server"');
    await act(async () => buttonOf('Close')?.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('the panels', () => {
  it("Share's line says the link is copied once it is", async () => {
    await draw(<SharePanel url="https://example.test/build/mcp-server?by=octocat" copied />);
    expect(host.querySelector('[data-build-share-line]')?.textContent).toBe(
      'The link is copied. Paste it in a post or a message.',
    );
    expect(host.textContent).not.toContain('How the link looks');
  });

  it("GitHub's panel draws as plain text outside a dialog", async () => {
    await draw(<GithubPanel words={githubWordsOf(project, 'octocat')} />);
    expect(host.querySelector('h2')?.textContent).toBe('Put your MCP server on GitHub');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('https://github.com/new');
  });
});

describe('the courses that help', () => {
  it("list each course's line and lessons, and give Go deeper its count", async () => {
    const courses = courseRowsOf(project, mcpServerCourseFacts);
    await draw(<ProjectView project={project} side={{ kind: 'visitor' }} courses={courses} />);
    const rows = [...host.querySelectorAll('[data-project-courses] li')].map((row) => row.textContent);
    expect(rows).toEqual([
      'Building MCP servers and clientsGiving AI apps tools and data over MCP, from messages to publishing70 lessons',
      'Working with LLM APIsCalling a model, tools, streaming and cost69 lessons',
    ]);
    await draw(<ProjectView project={project} side={built} courses={courses} />);
    expect(host.querySelector('[data-project-next]')?.textContent).toContain(
      'Go deeperBuilding MCP servers and clientsA Learn course · 70 lessons',
    );
  });
});
