// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const { HomeView } = await import('./home-view');
const { homeViewOf, VISITOR_HOME } = await import('@/lib/build/home');
const fixtures = await import('@/lib/build/__fixtures__/home');
const { BUILD_FIXTURE_NOW, buildProjectsFew, buildProjectsMany } = await import('@/lib/build/__fixtures__/projects');

const now = new Date(BUILD_FIXTURE_NOW);

describe("Build's home", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const draw = async (side: Parameters<typeof homeViewOf>[0], projects = buildProjectsFew, reading = false) =>
    act(async () =>
      root.render(<HomeView view={homeViewOf(side, projects)} projects={projects} now={now} reading={reading} />),
    );
  const text = () => container.textContent ?? '';
  const headings = () => [...container.querySelectorAll('h1, h2')].map((heading) => heading.textContent);
  const link = (name: string) =>
    [...container.querySelectorAll('a')].find((a) => a.textContent === name)?.getAttribute('href') ?? null;

  it('draws the landing for a visitor: one main button, how it works, the projects, the limits, questions', async () => {
    await act(async () => root.render(<HomeView view={VISITOR_HOME} projects={buildProjectsFew} />));
    expect(headings()).toEqual([
      'Build real things with your own AI agent',
      'How it works',
      'Projects',
      'What your agent does on your machine',
      'Questions',
    ]);
    expect(link('Connect your agent')).toBe('/build/start');
    expect(link('See the projects')).toBe('/build/projects');
    expect(container.querySelectorAll('[data-project-card]')).toHaveLength(5);
    expect(container.querySelector('[data-all-projects]')).toBeNull();
    expect(link('The code of every project, on GitHub')).toBe('https://github.com/gitranks/build');
    expect(link('How Build works')).toBe('/build/about');
    expect(text()).toContain('Free. Works with Claude Code, Codex, Cursor, Gemini CLI and VS Code.');
    expect(container.querySelector('[data-card-place]')).toBeNull();
  });

  it('turns the main button into "Pick a project" once an agent connected, in place', async () => {
    await draw(fixtures.sideAgentConnected);
    expect(container.querySelector('[data-landing-start]')?.getAttribute('data-landing-start')).toBe('pick');
    expect(link('Pick a project')).toBe('/build/projects');
    expect(link('How to start one')).toBe('/build/start');
    expect(link('Connect your agent')).toBeNull();
  });

  it('lists six projects at the most, then one link to all of them', async () => {
    await draw(fixtures.sideNone, buildProjectsMany);
    expect(container.querySelectorAll('[data-project-card]')).toHaveLength(6);
    expect(link('All 7 projects')).toBe('/build/projects');
  });

  it('leaves out the projects, heading included, when there are none', async () => {
    await draw(fixtures.sideNone, []);
    expect(headings()).not.toContain('Projects');
  });

  it("draws a builder's home: the build to go on with, the others, what to build next", async () => {
    await draw(fixtures.sideBuilder);
    expect(headings()).toEqual(['Your builds', 'Build an MCP server: step 9 of 16', 'Also in progress', 'Build next']);
    const box = container.querySelector('[data-home-box="build"]');
    expect(box?.textContent).toContain('TypeScript · last step 2 hours ago');
    expect(link('Check the input')).toBe('/build/mcp-server/check-the-input');
    expect(box?.querySelector('code')?.textContent).toBe('Continue my build');
    expect(box?.querySelectorAll('[data-square="done"]')).toHaveLength(8);
    expect(box?.querySelectorAll('[data-square="current"]')).toHaveLength(1);
    expect(box?.querySelectorAll('[data-square="to_come"]')).toHaveLength(7);
    const row = container.querySelector('[data-home-row="b-kv-py"]');
    expect(row?.textContent).toContain('Python · step 3 of 14');
    expect(row?.querySelector('a')?.getAttribute('href')).toBe('/build/key-value-database');
    expect(text()).toContain('Projects you have not started.');
    expect(container.querySelectorAll('[data-project-card]')).toHaveLength(2);
    expect(text()).not.toContain('Built');
  });

  it('puts a test that waits first, with the main button to take it', async () => {
    await draw(fixtures.sideTestWaits);
    const box = container.querySelector('[data-home-box="test"]');
    expect(box?.querySelector('h2')?.textContent).toBe('Build an MCP server: every step is done, the test is left');
    expect(box?.textContent).toContain('7 right makes the project Built.');
    expect(link('Take the test')).toBe('/build/mcp-server/test?language=typescript');
    expect(text()).toContain('About 3 minutes');
    expect(headings()).toContain('Also in progress');
    expect(container.querySelectorAll('[data-project-card]')).toHaveLength(3);
  });

  it('goes on with a test left in the middle, in place of taking it', async () => {
    await draw(fixtures.sideTestGoing);
    const box = container.querySelector('[data-home-box="end-going"]');
    expect(box?.querySelector('h2')?.textContent).toBe('Build an MCP server: you were on question 4 of 10');
    expect(box?.textContent).toContain('Your first three answers are kept. Go on from question 4.');
    expect(link('Go on with the test')).toBe('/build/mcp-server/test?language=typescript');
    expect(link('Take the test')).toBeNull();
  });

  it("says a failed test's score as the project's box does, with its answers to look at", async () => {
    await draw(fixtures.sideTestFailed);
    const box = container.querySelector('[data-home-box="test-failed"]');
    expect(box?.querySelector('h2')?.textContent).toBe('Build an MCP server: the test, 6 of 10 right. 7 are needed');
    expect(box?.textContent).toContain('Each wrong answer has its reason and its step.');
    expect(link('See your answers and try again')).toBe('/build/mcp-server/test?language=typescript');
  });

  it('says when a build with no step passed was started', async () => {
    const [build] = fixtures.sideBuilderAlone.home?.builds ?? [];
    const fresh = { ...build, stepsDone: [], lastStepAt: new Date(now.getTime() - 5 * 60_000).toISOString() };
    await draw({ ...fixtures.sideBuilderAlone, home: { builds: [fresh], tests: [], next: [] }, builds: [fresh] });
    expect(container.querySelector('[data-home-box="build"]')?.textContent).toContain('started 5 minutes ago');
    expect(text()).not.toContain('last step');
  });

  it("writes the gold test box's day in the zone the person's days are counted in", async () => {
    const view = homeViewOf(fixtures.sideGoldOpen, buildProjectsFew);
    await act(async () =>
      root.render(<HomeView view={view} projects={buildProjectsFew} now={now} zone="Pacific/Kiritimati" />),
    );
    expect(container.querySelector('[data-home-box="gold"]')?.textContent).toContain('Built on 13 Nov');
  });

  it('puts an open gold test first, with the day the project was built', async () => {
    await draw(fixtures.sideGoldOpen);
    const box = container.querySelector('[data-home-box="gold"]');
    expect(box?.querySelector('h2')?.textContent).toBe('The gold test of “Build an MCP server” is open');
    expect(box?.textContent).toContain('Built on 12 Nov');
    expect(link('Take the gold test')).toBe('/build/mcp-server/test/gold?language=typescript');
    expect(headings()).not.toContain('Also in progress');
  });

  it('points at the projects left when nothing waits, and at My builds for what was built', async () => {
    await draw(fixtures.sideNothingWaits);
    const box = container.querySelector('[data-home-box="pick"]');
    expect(box?.textContent).toContain('Nothing waits for you. Three projects are left to build.');
    expect(link('See the projects')).toBe('/build/projects');
    expect(link('My builds')).toBe('/build/mine');
  });

  it('says some projects are left, with no number, when the full list is missing', async () => {
    await draw(fixtures.sideNothingWaits, []);
    expect(container.querySelector('[data-home-box="pick"]')?.textContent).toContain(
      'Nothing waits for you, and there are projects left to build.',
    );
  });

  it('shows two builds of one project: one in the box, the other in a row', async () => {
    await draw(fixtures.sideTwoOfOne);
    expect(container.querySelector('[data-home-box="build"] h2')?.textContent).toBe(
      'Build an MCP server: step 9 of 16',
    );
    expect(container.querySelector('[data-home-row="b-mcp-py"]')?.textContent).toContain('Python · step 4 of 16');
  });

  it('wraps a long project name in the box and in a row', async () => {
    await draw(fixtures.sideLongNames);
    const heading = container.querySelector('[data-home-box="build"] h2');
    expect(heading?.textContent).toContain(fixtures.longName);
    expect(heading?.className).toContain('break-words');
    const name = container.querySelector('[data-home-row="b-kv-py"] span span');
    expect(name?.textContent).toBe(fixtures.longName);
    expect(name?.className).toContain('break-words');
  });

  it('leads to Learn and to real issues when every project is built, with no "Build next"', async () => {
    await draw(fixtures.sideAllBuilt);
    expect(container.querySelector('[data-home-box="all_built"] h2')?.textContent).toBe(
      'You built every project we have',
    );
    expect(link('Open Learn')).toBe('/learn');
    expect(link('Fix a real issue')).toBe('/contribute');
    expect(headings()).not.toContain('Build next');
    expect(headings()).not.toContain('Also in progress');
  });

  it('shows no "last step" until the clock is known', async () => {
    await act(async () =>
      root.render(<HomeView view={homeViewOf(fixtures.sideBuilderAlone, buildProjectsFew)} projects={[]} />),
    );
    expect(container.querySelector('[data-home-box="build"]')?.textContent).toContain('TypeScript');
    expect(text()).not.toContain('last step');
    expect(headings()).toEqual(['Your builds', 'Build an MCP server: step 9 of 16']);
  });

  it('stays hidden in its place for a browser with a session while the side is read', async () => {
    await draw(fixtures.sideNone, buildProjectsFew, true);
    const main = container.querySelector('main');
    expect(main?.className).toContain('[html[data-has-session]_&]:invisible');
    // Shown by the stylesheet after the time limit, whether or not a script ever runs.
    expect(main?.className).toContain('[html[data-has-session]_&]:animate-build-reveal');
    expect(main?.getAttribute('aria-busy')).toBe('true');
    await draw(fixtures.sideNone, buildProjectsFew, false);
    expect(container.querySelector('main')?.className).not.toContain('invisible');
  });

  it('never draws a zero', async () => {
    for (const side of Object.values(fixtures).filter(
      (value) => value && typeof value === 'object' && 'home' in value,
    )) {
      await draw(side as Parameters<typeof homeViewOf>[0]);
      expect(text()).not.toMatch(/\b0\b/);
    }
  });
});
