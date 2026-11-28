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
  useLinkStatus: () => ({ pending: false }),
}));

const { MineBody } = await import('./mine-parts');
const fixtures = await import('@/lib/build/__fixtures__/mine');
const { mineViewOf } = await import('@/lib/build/mine');
type List = Parameters<typeof mineViewOf>[0];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const onRemove = vi.fn(async (_build: string) => 'removed' as const);

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  onRemove.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const draw = (list: List, { asking = null as string | null, login = 'octocat' as string | null } = {}) =>
  act(async () => {
    root.render(
      <MineBody view={mineViewOf(list, fixtures.MINE_NOW, 'UTC')} login={login} asking={asking} onRemove={onRemove} />,
    );
  });

const headings = () => [...host.querySelectorAll('h2')].map((heading) => heading.textContent);
const rows = (kind: string) => [...host.querySelectorAll(`[data-build-mine-row="${kind}"]`)];
const text = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const buttonsOf = (row: Element) => [...row.querySelectorAll('a, button')].map((each) => text(each));

describe('My builds, from its fixtures', () => {
  it('draws someone with several: the tests first, then the builds in progress, then the built projects', async () => {
    await draw(fixtures.mineBoardFull);
    expect(headings()).toEqual(['Waiting for you', 'In progress', 'Built']);

    const tests = rows('test');
    expect(tests.map((row) => buttonsOf(row).at(-1))).toEqual(['Take the test', 'Take the gold test']);
    expect(tests[1].querySelector('a[href="/build/web-server/test/gold?language=typescript"]')).not.toBeNull();
    // The only main buttons are the tests'.
    expect(host.querySelectorAll('[data-variant="default"]')).toHaveLength(2);

    const progress = rows('progress');
    expect(progress).toHaveLength(2);
    expect(text(progress[0])).toContain('TypeScript · step 9 of 16 · last step 2 days ago');
    const squares = [...progress[0].querySelectorAll('[data-square]')].map((square) =>
      square.getAttribute('data-square'),
    );
    expect(squares).toHaveLength(16);
    expect(squares.indexOf('current')).toBe(8);
    expect(buttonsOf(progress[0]).slice(1)).toEqual([
      'Remove: Build an MCP server, TypeScript',
      'Open: Build an MCP server',
    ]);
    expect(text(host.querySelector('[data-build-say]'))).toContain('Continue my build');

    const built = rows('built');
    expect(built).toHaveLength(3);
    expect(text(built[0])).toContain('TypeScript · built 12 Nov · 8 of 10 in the test');
    expect(text(built[0])).toContain('The gold test is open. It is at the top of this page.');
    expect([...built[1].querySelectorAll('[data-mark]')].map((mark) => mark.getAttribute('data-mark'))).toEqual([
      'repeated',
      'answered',
    ]);
    expect(built[1].querySelector('[data-build-gold]')).toBeNull();
    expect(buttonsOf(built[0]).slice(1)).toEqual(['Your answers: Build a web server, TypeScript', 'ShareLink copied']);
    // Nothing of GitHub in this run.
    expect(host.textContent).not.toMatch(/GitHub/);

    expect(host.querySelector('[data-build-mine-next]')).toBeNull();
    expect(host.querySelector('[data-build-mine-skills] a')?.getAttribute('href')).toBe('/profile/octocat/skills');
  });

  it('says when a build with no step passed was started, not when its last step was', async () => {
    await draw({ tests: [], inProgress: [fixtures.mineMcpFirstStep], built: [] });
    expect(rows('progress')[0]?.textContent).toContain('started 24 Nov');
    expect(rows('progress')[0]?.textContent).not.toContain('last step');
  });

  it('draws a built project whose optional part is in progress as a build in progress too, with no "Remove"', async () => {
    const { buildInPart } = await import('@/lib/build/__fixtures__/builds');
    await draw({ tests: [], inProgress: [], built: [buildInPart] });
    expect(headings()).toEqual(['In progress', 'Built']);
    const [row] = rows('progress');
    expect(text(row)).toContain('TypeScript · optional part, step 3 of 6 · last step today');
    expect(buttonsOf(row)).toEqual(['Build an MCP server', 'Open: Build an MCP server']);
    expect(host.querySelector('[data-build-say]')).not.toBeNull();
    expect(rows('built')).toHaveLength(1);
    expect(host.querySelector('[data-build-mine-next]')).toBeNull();
  });

  it('draws the usual start: one build in progress, the sentence to say, and the line on Skills', async () => {
    await draw(fixtures.mineBoardOne);
    expect(headings()).toEqual(['In progress']);
    expect(rows('progress')).toHaveLength(1);
    expect(host.querySelector('[data-build-say]')).not.toBeNull();
    expect(host.querySelector('[data-build-mine-next]')).toBeNull();
    expect(text(host.querySelector('[data-build-mine-skills]'))).toBe(
      'Built projects also show on your Skills page, for everyone. Builds in progress show only here.',
    );
  });

  it('asks in the row\'s own place when "Remove" is pressed, and "Keep it" puts the row back', async () => {
    await draw(fixtures.mineBoardTwoInProgress);
    const [first] = rows('progress');
    await act(async () => (first.querySelector('button') as HTMLButtonElement).click());
    const asking = rows('progress')[0];
    expect(asking.getAttribute('data-remove')).toBe('asking');
    expect(text(asking)).toContain(
      'Remove this build? Its 8 passed steps are forgotten, and the folder on your computer stays as it is.',
    );
    expect(buttonsOf(asking).slice(1)).toEqual(['Remove the build', 'Keep it']);
    expect(document.activeElement?.textContent).toBe('Keep it');
    // The other row does not move or change.
    expect(rows('progress')[1].getAttribute('data-remove')).toBeNull();

    await act(async () =>
      (asking.querySelectorAll('button')[1] as HTMLButtonElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    );
    expect(rows('progress')[0].getAttribute('data-remove')).toBeNull();
    expect(document.activeElement?.textContent).toContain('Remove');
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('removes the build on "Remove the build", and says so when it could not', async () => {
    onRemove.mockResolvedValueOnce('failed' as never);
    await draw(fixtures.mineBoardTwoInProgress, { asking: fixtures.mineMcpInProgress.build });
    const removeButton = () => rows('progress')[0].querySelector('button') as HTMLButtonElement;
    await act(async () => removeButton().click());
    expect(onRemove).toHaveBeenCalledWith(fixtures.mineMcpInProgress.build);
    expect(rows('progress')[0].getAttribute('data-remove')).toBe('failed');
    expect(text(rows('progress')[0])).toContain('The build was not removed. Try again in a minute.');
    expect(document.activeElement?.textContent).toBe('Keep it');

    await act(async () => removeButton().click());
    expect(rows('progress')[0].getAttribute('data-remove')).toBeNull();
    expect(host.querySelector('[data-build-mine-status]')?.textContent).toBe('The build was removed.');
  });

  it('asks one question at a time: a build being removed keeps its row', async () => {
    let answer: (outcome: 'removed') => void = () => {};
    onRemove.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)) as never);
    await draw(fixtures.mineBoardTwoInProgress, { asking: fixtures.mineMcpInProgress.build });
    await act(async () => (rows('progress')[0].querySelector('button') as HTMLButtonElement).click());
    expect(rows('progress')[0].getAttribute('data-remove')).toBe('removing');
    await act(async () => (rows('progress')[1].querySelector('button') as HTMLButtonElement).click());
    expect(rows('progress')[0].getAttribute('data-remove')).toBe('removing');
    expect(rows('progress')[1].getAttribute('data-remove')).toBeNull();
    await act(async () => answer('removed'));
  });

  it("gives the refused build's name the focus once the list was read again", async () => {
    onRemove.mockResolvedValueOnce('reload' as never);
    await draw(fixtures.mineBoardTwoInProgress, { asking: fixtures.mineCodingAgent.build });
    await act(async () => (rows('progress')[1].querySelector('button') as HTMLButtonElement).click());
    expect(host.querySelector('[data-build-mine-notice]')).not.toBeNull();
    expect(document.activeElement?.textContent).toBe('Build a coding agent');
  });

  it('says when the gold test of a built project opens, with the optional parts built', async () => {
    await draw(fixtures.mineBoardGoldOpensOn);
    const [row] = rows('built');
    expect(text(row)).toContain('TypeScript · built 26 Nov · 9 of 10 in the test · 2 of 5 optional parts');
    expect(text(row.querySelector('[data-build-gold]'))).toBe(
      'The gold test opens on 3 Dec. We will email you that day, unless your Build reminders are off.',
    );
    expect(buttonsOf(row)).not.toContain('Take the gold test');
  });

  it('shows nothing where a mark would be on a project built with none', async () => {
    await draw(fixtures.mineBoardNoMark);
    const [row] = rows('built');
    expect(row.querySelector('[data-build-marks]')).toBeNull();
    expect(text(row)).toContain('Python · built 20 Nov · 7 of 10 in the test');
  });

  it('draws both marks, gold first, on a project built and repeated', async () => {
    await draw(fixtures.mineBoardRepeated);
    expect(text(rows('built')[0].querySelector('[data-build-marks]'))).toBe('Repeated after a weekAnswered every step');
  });

  it('draws only built projects with one line on, and no sentence to say', async () => {
    await draw(fixtures.mineBoardOnlyBuilt);
    expect(headings()).toEqual(['Built']);
    expect(rows('built')).toHaveLength(2);
    expect(host.querySelector('[data-build-say]')).toBeNull();
    expect(text(host.querySelector('[data-build-mine-next]'))).toBe('Nothing is in progress. Pick your next project');
    expect(host.querySelector('[data-build-mine-next] a')?.getAttribute('href')).toBe('/build/projects');
  });

  it('gives someone with nothing started one way on, to the projects', async () => {
    await draw(fixtures.mineBoardEmpty);
    expect(host.querySelector('[data-build-mine="empty"]')).not.toBeNull();
    expect(headings()).toEqual(['You have no builds yet']);
    expect(host.querySelector('a[href="/build/projects"]')?.textContent).toBe('See the projects');
    expect(host.querySelector('[data-build-mine-skills]')).toBeNull();
  });

  it('leaves the Skills page unlinked when the login is not known', async () => {
    await draw(fixtures.mineBoardOne, { login: null });
    expect(host.querySelector('[data-build-mine-skills] a')).toBeNull();
  });

  it('never draws a zero', async () => {
    for (const list of [fixtures.mineBoardFull, fixtures.mineBoardNoMark, fixtures.mineBoardOne]) {
      await draw(list);
      expect(host.textContent).not.toMatch(/\b0\b/);
    }
  });
});
