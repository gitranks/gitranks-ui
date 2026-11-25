// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/my/agent' }));
vi.mock('next/navigation', () => ({ usePathname: () => at.path }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'loading' }) }));
vi.mock('@/lib/learn/setup.actions', () => ({ startLearnSetupGuessAction: vi.fn() }));
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

const { LearnDoorCount } = await import('./learn-door-count');
const { LearnDoor } = await import('@/components/workspace/learn-door');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bar = (due: number) => ({ bar: { setup: 'SAVED', due, pullRequests: false, pullRequestsNeedYou: 0 } });
const answer = (body: unknown, ok = true) => Promise.resolve({ ok, json: async () => body } as Response);

describe("the door's count", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    at.path = '/my/agent';
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const draw = async () => {
    await act(async () => root.render(<LearnDoor count={<LearnDoorCount />} />));
    return container.querySelector('a')?.textContent?.replace(/\s+/g, ' ').trim();
  };

  it("reads the lessons due in the browser, from Learn's bar, and shows them in the door", async () => {
    fetch.mockReturnValueOnce(answer(bar(6)));
    expect(await draw()).toBe('Learn 6 lessons due');
    expect(fetch).toHaveBeenCalledWith('/api/me/learn/bar', { cache: 'no-store' });
  });

  it('reads them again on each move to another page', async () => {
    fetch.mockReturnValueOnce(answer(bar(6))).mockReturnValueOnce(answer(bar(1)));
    expect(await draw()).toBe('Learn 6 lessons due');
    at.path = '/my/settings';
    expect(await draw()).toBe('Learn 1 lesson due');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows the word alone with none due, and after a read that fails, the room for the count kept', async () => {
    fetch.mockReturnValueOnce(answer(bar(0)));
    expect(await draw()).toBe('Learn');
    at.path = '/my/pull-requests';
    fetch.mockReturnValueOnce(answer({ error: 'down' }, false));
    expect(await draw()).toBe('Learn');
    at.path = '/contribute';
    fetch.mockReturnValueOnce(Promise.reject(new Error('offline')));
    expect(await draw()).toBe('Learn');
    at.path = '/my/agent/runs';
    fetch.mockReturnValueOnce(answer({ bar: null }));
    expect(await draw()).toBe('Learn');
    expect(container.querySelector('[data-learn-door-count]')?.className).toContain('min-w-7');
  });

  it('drops a count read for a page left before it answered', async () => {
    let late: (value: Response) => void = () => {};
    fetch.mockReturnValueOnce(new Promise<Response>((resolve) => (late = resolve))).mockReturnValueOnce(answer(bar(2)));
    await draw();
    at.path = '/my/settings';
    expect(await draw()).toBe('Learn 2 lessons due');
    await act(async () => late({ ok: true, json: async () => bar(9) } as Response));
    expect(container.querySelector('a')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Learn 2 lessons due');
  });
});
