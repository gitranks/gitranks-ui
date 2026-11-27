// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn(), readMoreLearnFixes: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

const { MyProgressLive } = await import('./my-progress-live');
const { resetInterviewsViewer } = await import('@/components/interviews/interviews-viewer');
const { myHomeNone, myHomeTwo } = await import('@/lib/interviews/__fixtures__/mine');
const { myProgress } = await import('@/lib/learn/__fixtures__/my-progress');

/* My progress with the row of the plan to go on with: read in the browser, for a person Interviews is open to. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const paths = () => fetchMock.mock.calls.map(([path]) => path as string);

function routes(open: boolean, home: unknown = myHomeTwo) {
  fetchMock.mockImplementation(async (path: string) => {
    if (path === '/api/me/interviews/open') return Response.json({ open });
    if (path === '/api/me/interviews/home') return Response.json({ home });
    return Response.json({ progress: myProgress, signedOut: false });
  });
}

const draw = () =>
  act(async () => {
    root.render(<MyProgressLive view="courses" day={null} />);
  });

beforeEach(() => {
  window.history.replaceState(null, '', '/learn/progress');
  resetInterviewsViewer();
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

describe('My progress with an interview plan', () => {
  it('puts the row at the top once the progress is in, for a person Interviews is open to', async () => {
    hint.present = true;
    routes(true);
    await draw();
    const main = host.querySelector('main')!;
    expect(main.firstElementChild!.hasAttribute('data-plan-row')).toBe(true);
    expect(main.querySelector('[data-plan-row-more]')!.textContent).toBe('1 more plan');
    expect(paths()).toContain('/api/me/interviews/home');
  });

  it('shows the page only once the plans are known, so the row comes with it', async () => {
    hint.present = true;
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation((path: string) => {
      if (path === '/api/me/interviews/open') return Promise.resolve(Response.json({ open: true }));
      if (path === '/api/me/interviews/home') return new Promise<Response>((resolve) => (answer = resolve));
      return Promise.resolve(Response.json({ progress: myProgress, signedOut: false }));
    });
    await draw();
    expect(host.querySelector('[data-my-progress="pending"]')).not.toBeNull();
    await act(async () => answer(Response.json({ home: myHomeTwo })));
    expect(host.querySelector('main')!.firstElementChild!.hasAttribute('data-plan-row')).toBe(true);
  });

  it('has no row with no plan to go on with, or while Interviews is closed to the person', async () => {
    hint.present = true;
    routes(true, myHomeNone);
    await draw();
    expect(host.querySelector('[data-plan-row]')).toBeNull();
    act(() => root.unmount());
    root = createRoot(host);
    resetInterviewsViewer();
    fetchMock.mockReset();
    routes(false);
    await draw();
    expect(host.querySelector('[data-plan-row]')).toBeNull();
    expect(paths()).not.toContain('/api/me/interviews/home');
  });

  it('asks nothing of Interviews for a visitor', async () => {
    routes(true);
    await draw();
    expect(host.querySelector('[data-plan-row]')).toBeNull();
    expect(paths().filter((path) => path.startsWith('/api/me/interviews'))).toEqual([]);
  });
});
