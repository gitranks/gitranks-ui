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
const { hint, signIn } = vi.hoisted(() => ({ hint: { present: true }, signIn: vi.fn(async () => undefined) }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('next-auth/react', () => ({
  signIn,
  useSession: () => ({ data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' }),
}));

const { BuildMineLive } = await import('./mine-live');
const { mineBoardFull, mineBoardOne, mineBoardOnlyBuilt, mineMcpInProgress } = await import(
  '@/lib/build/__fixtures__/mine'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** The two routes: My builds, read in turn from `lists`, and removing a build. */
function routes({ lists = [mineBoardFull as unknown], remove = json({ ok: true, data: true }) as Response } = {}) {
  let read = 0;
  fetchMock.mockImplementation(async (path: string) => {
    if (path === '/api/me/build/remove') return remove.clone();
    const mine = lists[Math.min(read++, lists.length - 1)];
    return mine === 'down' ? json({}, 502) : json({ mine });
  });
}
const removeCalls = () => fetchMock.mock.calls.filter(([path]) => path === '/api/me/build/remove');

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  signIn.mockClear();
  hint.present = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const draw = () =>
  act(async () => {
    root.render(<BuildMineLive />);
  });
const click = (element: Element | null | undefined) =>
  act(async () => {
    (element as HTMLElement).click();
  });
const stateOf = () =>
  host.querySelector('[data-build-mine]:not([data-build-mine-row])')?.getAttribute('data-build-mine') ?? null;
const progressRows = () => [...host.querySelectorAll('[data-build-mine-row="progress"]')];
const buttonNamed = (name: string) =>
  [...host.querySelectorAll('button')].find((button) => button.textContent?.startsWith(name));

describe('My builds in the browser', () => {
  it('asks a visitor to sign in, and reads nothing', async () => {
    hint.present = false;
    routes();
    await draw();
    expect(stateOf()).toBe('visitor');
    expect(host.querySelector('h1')?.textContent).toBe('My builds');
    expect(fetchMock).not.toHaveBeenCalled();
    await click(buttonNamed('Sign in with GitHub'));
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/build/mine' });
  });

  it("reads the person's builds and draws them", async () => {
    routes();
    await draw();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/build/mine', { cache: 'no-store' });
    expect(stateOf()).toBe('ready');
    expect([...host.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'Waiting for you',
      'In progress',
      'Built',
    ]);
    expect(host.querySelector('[data-build-mine-skills] a')?.getAttribute('href')).toBe('/profile/octocat/skills');
  });

  it('says a read that failed, and reads again on "Try again"', async () => {
    routes({ lists: ['down', mineBoardOne] });
    await draw();
    expect(stateOf()).toBe('failed');
    await click(buttonNamed('Try again'));
    expect(stateOf()).toBe('ready');
    expect(progressRows()).toHaveLength(1);
  });

  it('reads a null answer (Build not open, or an API that does not know it) as a failed read', async () => {
    routes({ lists: [null] });
    await draw();
    expect(stateOf()).toBe('failed');
  });

  it('removes a build in progress: its row goes, and the list it was in takes the focus', async () => {
    routes({ lists: [mineBoardFull] });
    await draw();
    await click(progressRows()[0].querySelector('button'));
    await click(buttonNamed('Remove the build'));
    expect(removeCalls()).toHaveLength(1);
    const [, init] = removeCalls()[0];
    expect(JSON.parse(init.body)).toEqual({ build: mineMcpInProgress.build });
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(progressRows().map((row) => row.getAttribute('data-build'))).toEqual(['b-agent-py']);
    expect(document.activeElement?.id).toBe('build-mine-progress');
  });

  it('drops "In progress" when its last build is removed, and leads on to the projects', async () => {
    routes({ lists: [{ ...mineBoardOnlyBuilt, inProgress: [mineMcpInProgress] }] });
    await draw();
    await click(progressRows()[0].querySelector('button'));
    await click(buttonNamed('Remove the build'));
    expect(progressRows()).toHaveLength(0);
    expect(host.querySelector('#build-mine-progress')).toBeNull();
    expect(host.querySelector('[data-build-mine-next]')).not.toBeNull();
  });

  it('shows the empty page once the only build is removed', async () => {
    routes({ lists: [mineBoardOne] });
    await draw();
    await click(progressRows()[0].querySelector('button'));
    await click(buttonNamed('Remove the build'));
    expect(host.querySelector('[data-build-mine="empty"]')).not.toBeNull();
    expect(document.activeElement?.id).toBe('build-mine-empty');
  });

  it('keeps the row asking, with a sentence, when removing failed', async () => {
    routes({ lists: [mineBoardOne], remove: json({ ok: false, error: 'FAILED' }, 502) });
    await draw();
    await click(progressRows()[0].querySelector('button'));
    await click(buttonNamed('Remove the build'));
    expect(progressRows()[0].getAttribute('data-remove')).toBe('failed');
  });

  it('reads the list again when the API refuses (built since, or gone)', async () => {
    const built = { ...mineBoardOnlyBuilt };
    routes({ lists: [mineBoardOne, built], remove: json({ ok: false, error: 'INVALID' }, 400) });
    await draw();
    await click(progressRows()[0].querySelector('button'));
    await click(buttonNamed('Remove the build'));
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/me/build/mine')).toHaveLength(2);
    expect(progressRows()).toHaveLength(0);
    expect(host.querySelectorAll('[data-build-mine-row="built"]')).toHaveLength(2);
  });

  it('asks to sign in again when the session ended', async () => {
    routes({ lists: [mineBoardOne], remove: json({ ok: false, error: 'SIGNED_OUT' }, 401) });
    await draw();
    await click(progressRows()[0].querySelector('button'));
    await click(buttonNamed('Remove the build'));
    expect(stateOf()).toBe('ended');
  });
});
