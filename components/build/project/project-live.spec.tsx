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
// The zone the person's days are counted in, as the API's route answers it; and the note that sends the browser's zone,
// which these pages no longer draw (the zone is saved before their reads).
// The save of the browser's zone, when it is new, which the reads wait for: settled at once unless a test holds it.
const zoneRead = vi.hoisted(() => ({ value: 'UTC' as string | undefined }));
const zoneSave = vi.hoisted(() => ({ held: null as Promise<void> | null }));
vi.mock('@/lib/build/zone-live', () => ({
  readBuildZone: async () => zoneRead.value,
  zoneSent: () => zoneSave.held ?? Promise.resolve(),
}));
vi.mock('@/components/workspace/time-zone-note', () => ({ TimeZoneNote: () => <span data-time-zone-note="" /> }));

const { ProjectLive, readProjectMine } = await import('./project-live');
const {
  mcpServerFiveParts,
  mineGoldOpen,
  mineBuilt,
  mineInProgress,
  mineTestLeft,
  mineTwoBuilds,
  endTestFailedNow,
  testLeftOnePart,
} = await import('@/lib/build/__fixtures__/project-page');
const { goldTestReady, testRun } = await import('@/lib/build/__fixtures__/test');

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
const held = () => host.querySelector('[data-project-held]');

describe("a project's page in the browser", () => {
  it('asks nothing for a visitor, and shows the box for connecting an agent', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(boxKind()).toBe('connect');
    expect(held()).toBeNull();
    expect(host.querySelector('[data-time-zone-note]')).toBeNull();
  });

  it('with a session, holds what may change in its place while the side is read, then shows it', async () => {
    hint.present = true;
    let arrive: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (arrive = resolve)));
    await draw();
    expect(held()?.getAttribute('aria-busy')).toBe('true');
    await act(async () => arrive(new Response(JSON.stringify({ mine: mineInProgress }), { status: 200 })));
    expect(held()).toBeNull();
    expect(boxKind()).toBe('in_progress');
  });

  it('a read that does not come in time stops holding the page, so it never stays hidden', async () => {
    vi.useFakeTimers();
    try {
      hint.present = true;
      fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
      await draw();
      expect(held()).not.toBeNull();
      await act(async () => vi.advanceTimersByTime(4_000));
      expect(held()).toBeNull();
      expect(boxKind()).toBe('connect');
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads a person's side once, and fills the box and the marks in place", async () => {
    hint.present = true;
    answer(mineInProgress);
    await draw();
    expect(urls()).toEqual(['/api/me/build/projects/mcp-server']);
    expect(boxKind()).toBe('in_progress');
    expect(host.querySelectorAll('[data-mark="done"]')).toHaveLength(8);
    expect(host.querySelector('[data-project-have]')).toBeNull();
    // The browser's zone was saved before the reads: no note sends it again.
    expect(host.querySelector('[data-time-zone-note]')).toBeNull();
  });

  it("reads the person's side only once a new zone of the browser is saved, so the first page's days are in it", async () => {
    hint.present = true;
    answer(mineInProgress);
    let saved: () => void = () => {};
    zoneSave.held = new Promise<void>((resolve) => {
      saved = resolve;
    });
    try {
      await draw();
      expect(fetchMock).not.toHaveBeenCalled();
      await act(async () => saved());
      expect(urls()).toEqual(['/api/me/build/projects/mcp-server']);
      expect(boxKind()).toBe('in_progress');
    } finally {
      zoneSave.held = null;
    }
  });

  it("writes the box's dates in the zone the person's days are counted in", async () => {
    hint.present = true;
    zoneRead.value = 'Pacific/Kiritimati';
    try {
      answer(mineBuilt);
      await draw();
      expect(host.querySelector('[data-project-box] h2')?.textContent).toBe('Built on 27 Nov 2026');
    } finally {
      zoneRead.value = 'UTC';
    }
  });

  it('reads the gold test once it is open, and goes on with a run left in the middle', async () => {
    hint.present = true;
    answer(mineGoldOpen, { ...goldTestReady, open: testRun, canStart: false });
    await draw();
    expect(urls()).toEqual([
      '/api/me/build/projects/mcp-server',
      '/api/me/build/test?project=mcp-server&kind=gold&plain=1',
    ]);
    expect(host.querySelector('[data-project-box]')?.textContent).toContain(
      'The gold test: you were on question 4 of 10. Your first three answers are kept. Go on from question 4.',
    );
    const goOn = [...host.querySelectorAll('a')].find((link) => link.textContent === 'Go on with the gold test');
    expect(goOn?.getAttribute('href')).toBe('/build/mcp-server/test/gold');
  });

  it('reads no test for a build none waits for', async () => {
    hint.present = true;
    answer(mineBuilt);
    await draw();
    expect(urls()).toEqual(['/api/me/build/projects/mcp-server']);
  });

  it('reads the end test too when the build has the test left, and says a failed score', async () => {
    hint.present = true;
    answer(mineTestLeft, endTestFailedNow);
    await draw();
    expect(urls()).toEqual([
      '/api/me/build/projects/mcp-server',
      '/api/me/build/test?project=mcp-server&kind=end&plain=1',
    ]);
    expect(boxKind()).toBe('test_failed');
  });

  it("names the build's language in the test's read when the person has two builds", async () => {
    hint.present = true;
    answer({ ...mineTwoBuilds, builds: [testLeftOnePart, mineTwoBuilds.builds[1]] }, null);
    await draw();
    expect(urls()[1]).toBe('/api/me/build/test?project=mcp-server&kind=end&language=typescript&plain=1');
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
