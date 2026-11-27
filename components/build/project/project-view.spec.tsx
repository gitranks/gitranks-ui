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

const { ProjectView } = await import('./project-view');
const { mcpServerProject, smallProject } = await import('@/lib/build/__fixtures__/project');
const fixtures = await import('@/lib/build/__fixtures__/project-page');
type Side = import('@/lib/build/project').ProjectSide;
type Mine = import('@/lib/build/types').BuildProjectMine;
type Test = import('@/lib/build/types').BuildTest;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
});

const draw = (side: Side, project = fixtures.mcpServerFiveParts, openParts?: string[]) =>
  act(async () => {
    root.render(<ProjectView project={project} side={side} openParts={openParts} />);
  });
const person = (mine: Mine, test: Test | null = null): Side => ({ kind: 'person', mine, test });

const box = () => host.querySelector<HTMLElement>('[data-project-box]');
const boxKind = () => box()?.dataset.projectBox;
const boxText = () => box()?.textContent ?? '';
const title = () => box()?.querySelector('h2')?.textContent ?? '';
const linkOf = (text: string) =>
  [...host.querySelectorAll<HTMLAnchorElement>('a')].find((link) => link.textContent?.trim() === text);
const buttonOf = (text: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes(text));
const sections = () =>
  [...host.querySelectorAll('main > section h2, main > section > div > h2')].map((h) => h.textContent);
const mainButtons = () => box()?.querySelectorAll('[data-slot="button"]') ?? [];
const marks = (mark: string) => [...host.querySelectorAll(`[data-step-row][data-mark="${mark}"]`)];

describe("a project's page, what it is", () => {
  it('leads back to all projects, then the name, the line and the facts', async () => {
    await draw({ kind: 'visitor' });
    expect(linkOf('All projects')?.getAttribute('href')).toBe('/build/projects');
    expect(host.querySelector('h1')?.textContent).toBe('Build an MCP server');
    expect(host.querySelector('[data-project-facts]')?.textContent).toBe(
      'Easy · 16 steps, about an hour and a half · TypeScript or Python',
    );
  });
});

describe('the box, in each state', () => {
  it('1 · not signed in: the sentence and one main button, "Connect your agent", to the start flow', async () => {
    await draw({ kind: 'visitor' });
    expect(boxKind()).toBe('connect');
    expect(title()).toBe('Build it with your own agent');
    expect(boxText()).toContain('You need an agent of your own, connected to GitRanks');
    expect(boxText()).toContain('Teach me how to build an MCP server with GitRanks');
    expect(mainButtons()).toHaveLength(1);
    expect(linkOf('Connect your agent')?.getAttribute('href')).toBe('/build/start?project=mcp-server');
    expect(linkOf('How Build works')?.getAttribute('href')).toBe('/build/about');
  });

  it('a session whose side did not come reads as a visitor, never asked to sign in', async () => {
    await draw({ kind: 'session' });
    expect(boxKind()).toBe('connect');
    expect(boxText()).not.toMatch(/sign in/i);
  });

  it('while the side is on its way: the sentence, and no button that may turn out wrong', async () => {
    await draw({ kind: 'pending' });
    expect(boxKind()).toBe('pending');
    expect(boxText()).toContain('Teach me how to build an MCP server with GitRanks');
    expect(mainButtons()).toHaveLength(0);
  });

  it('2 · signed in, no agent ever connected: the same main button', async () => {
    await draw(person(fixtures.mineNoAgent));
    expect(boxKind()).toBe('connect');
    expect(boxText()).toContain('No agent is connected to your GitRanks account yet.');
    expect(linkOf('Connect your agent')).toBeDefined();
  });

  it('3 · an agent connected, nothing started: no button, the sentence is the action', async () => {
    await draw(person(fixtures.mineAgentNoBuild));
    expect(boxKind()).toBe('say');
    expect(mainButtons()).toHaveLength(0);
    expect(boxText()).toContain('Say this in your agent.');
    expect(box()?.querySelector('code')?.textContent).toBe(fixtures.START_SAY);
    expect(linkOf('Connect it too')?.getAttribute('href')).toBe('/my/agent/connect');
  });

  it('4 · a build in progress: its step, the squares, the next step, "Continue my build"', async () => {
    await draw(person(fixtures.mineInProgress));
    expect(boxKind()).toBe('in_progress');
    expect(title()).toBe('Your build is on step 9 of 16');
    expect(boxText()).toContain('TypeScript · last step 26 Nov');
    const squares = [...(box()?.querySelectorAll<HTMLElement>('[data-square]') ?? [])].map((s) => s.dataset.square);
    expect(squares).toHaveLength(16);
    expect(squares.filter((square) => square === 'done')).toHaveLength(8);
    expect(squares[8]).toBe('current');
    expect(linkOf('Check the input')?.getAttribute('href')).toBe('/build/mcp-server/check-the-input');
    expect(box()?.querySelector('code')?.textContent).toBe('Continue my build');
    expect(boxText()).toContain('It picks up at step 9.');
    expect(mainButtons()).toHaveLength(0);
  });

  it('5 · the test left: "Take the test" is the main button, the optional parts offered beside it', async () => {
    await draw(person(fixtures.mineTestLeft));
    expect(boxKind()).toBe('test_left');
    expect(title()).toBe('All 16 steps are done. One thing is left: the test');
    expect(mainButtons()).toHaveLength(1);
    expect(linkOf('Take the test')?.getAttribute('href')).toBe('/build/mcp-server/test');
    expect(boxText()).toContain('About 3 minutes');
    expect(boxText()).toContain(
      'Or keep building first. You built 1 of the 5 optional parts; the next is Resources: data your agent can read. The test waits for you.',
    );
    expect(linkOf('Resources: data your agent can read')?.getAttribute('href')).toBe(
      '/build/mcp-server/what-a-resource-is',
    );
  });

  it('5 · the test left with no optional part: no line about parts', async () => {
    await draw(person({ ...fixtures.mineTestLeft }), smallProject);
    expect(boxKind()).toBe('test_left');
    expect(box()?.querySelector('[data-project-box-quiet]')).toBeNull();
  });

  it('6 · the test not passed: its score, and "Take the test again"', async () => {
    await draw(person(fixtures.mineTestLeft, fixtures.endTestFailedNow));
    expect(boxKind()).toBe('test_failed');
    expect(title()).toBe('The test: 6 of 10 right. 7 are needed');
    expect(linkOf('Take the test again')?.getAttribute('href')).toBe('/build/mcp-server/test');
    expect(linkOf('See your answers of last time')).toBeDefined();
    expect(mainButtons()).toHaveLength(1);
  });

  it('7 · built, the gold test opens on a date: the date, the score, the marks', async () => {
    await draw(person(fixtures.mineBuilt));
    expect(boxKind()).toBe('built');
    expect(title()).toBe('Built on 26 Nov 2026');
    expect(boxText()).toContain('TypeScript · 9 of 10 in the test');
    expect(boxText()).toContain('Answered every step');
    expect(boxText()).toContain('1 of 5 optional parts built');
    expect(boxText()).toContain('The gold test opens on 3 Dec, a week after you built it');
    expect(mainButtons()).toHaveLength(0);
  });

  it('7 · built, the gold test failed today: it opens again tomorrow', async () => {
    await draw(person(fixtures.mineGoldFailedToday));
    expect(boxText()).toContain('The gold test opens again on 27 Nov');
  });

  it('8 · built, the gold test open: "Take the gold test" is the main button', async () => {
    await draw(person(fixtures.mineGoldOpen));
    expect(boxText()).toContain('The gold test is open: 10 questions, and 8 right earns the gold mark. One try a day.');
    expect(linkOf('Take the gold test')?.getAttribute('href')).toBe('/build/mcp-server/test/gold');
    expect(mainButtons()).toHaveLength(1);
  });

  it('9 · built and repeated: both dates and the gold mark', async () => {
    await draw(person(fixtures.mineGoldEarned));
    expect(title()).toBe('Built on 3 Nov 2026, repeated on 11 Nov');
    expect(box()?.querySelector('[data-project-chip="repeated"]')?.textContent).toBe('Repeated after a week');
    expect(mainButtons()).toHaveLength(0);
  });

  it('10 · built, now in an optional part: the part, its squares, "Continue my build"', async () => {
    await draw(person(fixtures.mineInPart));
    expect(boxText()).toContain('TypeScript · now in an optional part');
    expect(boxText()).toContain('Serve it over HTTP: step 3 of 7');
    expect(box()?.querySelectorAll('[data-square]')).toHaveLength(7);
    expect(box()?.querySelector('code')?.textContent).toBe('Continue my build');
    expect(boxText()).toContain('The gold test opens on 3 Dec.');
    expect(box()?.querySelector('[data-project-chip="parts"]')).toBeNull();
  });

  it('11 · two builds: the box is the one touched last, and names the other in one line', async () => {
    await draw(person(fixtures.mineTwoBuilds));
    expect(title()).toBe('Your build is on step 9 of 16');
    expect(host.querySelectorAll('[data-project-box]')).toHaveLength(1);
    expect(box()?.querySelector('[data-project-other-build]')?.textContent).toBe('Your Python build: step 4 of 16.');
  });

  it("two builds with the test left: the test's address names this build's language", async () => {
    await draw(
      person({ ...fixtures.mineTwoBuilds, builds: [fixtures.testLeftOnePart, fixtures.mineTwoBuilds.builds[1]] }),
    );
    expect(linkOf('Take the test')?.getAttribute('href')).toBe('/build/mcp-server/test?language=typescript');
  });
});

describe('the sections around the box', () => {
  it('a visitor reads every section, in the order of the boards', async () => {
    await draw({ kind: 'visitor' });
    expect(sections()).toEqual(['What you will have', 'The steps', 'Before you start', 'What you need']);
    expect(host.querySelector('[data-project-needs]')?.textContent).toContain(
      'Node 22 or newer, or Python 3.12 or newer',
    );
    expect(linkOf('Building MCP servers and clients')?.getAttribute('href')).toBe('/learn/courses/mcp');
  });

  it('once a build exists, the sections about starting are not shown', async () => {
    await draw(person(fixtures.mineInProgress));
    expect(sections()).toEqual(['The steps']);
  });

  it('a built project adds "What next" right under the box', async () => {
    await draw(person(fixtures.mineBuilt));
    expect(sections()).toEqual(['What next', 'The steps']);
    const next = host.querySelector('[data-project-next]');
    expect(next?.textContent).toContain('Go on with this project');
    expect(next?.textContent).toContain('Build next');
    expect(next?.textContent).toContain('Go deeper');
  });

  it('the small project: no parts, no courses; nothing is left empty', async () => {
    await draw({ kind: 'visitor' }, fixtures.jsonParserProject);
    expect(sections()).toEqual(['What you will have', 'The steps', 'What you need']);
    expect(host.querySelector('[data-project-parts]')).toBeNull();
    expect(host.querySelector('[data-project-facts]')?.textContent).toContain('12 steps, about an hour');
    expect(host.textContent).not.toMatch(/\b0 /);
  });
});

describe('the steps', () => {
  it('are rows, each a link to its page, with no mark for a visitor', async () => {
    await draw({ kind: 'visitor' }, mcpServerProject);
    const rows = host.querySelectorAll('[data-project-base] [data-step-row]');
    expect(rows).toHaveLength(16);
    expect(rows[6].querySelector('a')?.getAttribute('href')).toBe('/build/mcp-server/list-the-tools');
    expect(marks('done')).toHaveLength(0);
  });

  it("mark the person's passed steps and the step they are on", async () => {
    await draw(person(fixtures.mineInProgress));
    expect(marks('done')).toHaveLength(8);
    expect(marks('current').map((row) => row.textContent)).toEqual(['9Check the inputYou are here']);
  });

  it('open a part in place, and fold it again', async () => {
    await draw({ kind: 'visitor' });
    const toggle = buttonOf('Serve it over HTTP');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[data-part-row="http"] ol')).toBeNull();
    await act(async () => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    const steps = host.querySelectorAll('[data-part-row="http"] ol [data-step-row]');
    expect(steps).toHaveLength(7);
    expect(steps[0].querySelector('a')?.getAttribute('href')).toBe('/build/mcp-server/one-address-one-post');
    await act(async () => toggle?.click());
    expect(host.querySelector('[data-part-row="http"] ol')).toBeNull();
  });

  it('mark a built part, and a part in progress with how many of its steps are passed', async () => {
    await draw(person(fixtures.mineInPart), fixtures.mcpServerFiveParts, ['http']);
    expect(host.querySelector('[data-part-row="official-sdk"] button')?.textContent).toContain('Built');
    const http = host.querySelector('[data-part-row="http"]');
    expect(http?.querySelector('button')?.textContent).toContain('2 of 7');
    expect(http?.querySelectorAll('[data-mark="done"]')).toHaveLength(2);
    expect(http?.querySelector('[data-mark="current"]')?.textContent).toContain('Answer a message over HTTP');
    expect(host.querySelector('[data-part-row="resources"] button')?.textContent).not.toMatch(/of 5|Built/);
  });
});
