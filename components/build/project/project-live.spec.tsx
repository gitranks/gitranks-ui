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
const hint = vi.hoisted(() => ({ present: false }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { ProjectLive, readProjectMine } = await import('./project-live');
const { mcpServerFiveParts, mineInProgress, mineTestLeft, mineTwoBuilds, endTestFailedNow, testLeftOnePart } =
  await import('@/lib/build/__fixtures__/project-page');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

/** The person's side answers `mine`; their test answers `test`. */
const answer = (mine: unknown, test: unknown = null, status = 200) =>
  fetchMock.mockImplementation(async (url: string) =>
    String(url).startsWith('/api/me/build/test')
      ? new Response(JSON.stringify({ test }), { status: 200 })
      : new Response(JSON.stringify({ mine }), { status }),
  );
const urls = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  hint.present = false;
  vi.unstubAllGlobals();
});

const draw = () =>
  act(async () => {
    root.render(<ProjectLive project={mcpServerFiveParts} />);
  });
const boxKind = () => host.querySelector<HTMLElement>('[data-project-box]')?.dataset.projectBox;

describe("a project's page in the browser", () => {
  it('asks nothing for a visitor, and shows the box for connecting an agent', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(boxKind()).toBe('connect');
  });

  it("reads a person's side once, and fills the box and the marks in place", async () => {
    hint.present = true;
    answer(mineInProgress);
    await draw();
    expect(urls()).toEqual(['/api/me/build/projects/mcp-server']);
    expect(boxKind()).toBe('in_progress');
    expect(host.querySelectorAll('[data-mark="done"]')).toHaveLength(8);
    expect(host.querySelector('[data-project-have]')).toBeNull();
  });

  it('reads the end test too when the build has the test left, and says a failed score', async () => {
    hint.present = true;
    answer(mineTestLeft, endTestFailedNow);
    await draw();
    expect(urls()).toEqual(['/api/me/build/projects/mcp-server', '/api/me/build/test?project=mcp-server&kind=end']);
    expect(boxKind()).toBe('test_failed');
  });

  it("names the build's language in the test's read when the person has two builds", async () => {
    hint.present = true;
    answer({ ...mineTwoBuilds, builds: [testLeftOnePart, mineTwoBuilds.builds[1]] }, null);
    await draw();
    expect(urls()[1]).toBe('/api/me/build/test?project=mcp-server&kind=end&language=typescript');
    expect(boxKind()).toBe('test_left');
  });

  it('a side that does not come leaves the page as for a visitor, never pending', async () => {
    hint.present = true;
    answer(null, null, 500);
    await draw();
    expect(boxKind()).toBe('connect');
  });

  it('draws only a whole side', async () => {
    answer({ builds: 'no', agentConnected: true, say: 'x' });
    await expect(readProjectMine('mcp-server')).resolves.toBeNull();
    answer({ builds: [], agentConnected: true });
    await expect(readProjectMine('mcp-server')).resolves.toEqual({ builds: [], agentConnected: true, say: '' });
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(readProjectMine('mcp-server')).resolves.toBeNull();
  });
});
