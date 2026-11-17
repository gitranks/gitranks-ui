// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session } = vi.hoisted(() => ({ session: { current: { data: null } as { data: unknown } } }));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));

const { PACKAGES_OPEN_PATH, resetPackagesOpen, usePackagesOpen } = await import('./packages-open');

function Probe() {
  return <span>{usePackagesOpen() ? 'open' : 'closed'}</span>;
}

const signedIn = (githubLogin: string) => ({ data: { user: { githubLogin } } });

describe('usePackagesOpen', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  const render = async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    return container.textContent;
  };

  beforeEach(() => {
    resetPackagesOpen();
    session.current = { data: null };
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ open: true })));
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it('is open once the route says so for the signed-in viewer, asked once', async () => {
    session.current = signedIn('octocat');
    expect(await render()).toBe('open');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(PACKAGES_OPEN_PATH);

    await render();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('is false until the answer comes', async () => {
    session.current = signedIn('octocat');
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)));

    expect(await render()).toBe('closed');
    await act(async () => answer(new Response(JSON.stringify({ open: true }))));
    expect(container.textContent).toBe('open');
  });

  it('is false signed out, without asking', async () => {
    expect(await render()).toBe('closed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is false when the route says no, and when it fails', async () => {
    session.current = signedIn('octocat');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ open: false })));
    expect(await render()).toBe('closed');

    resetPackagesOpen();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    session.current = signedIn('hubot');
    expect(await render()).toBe('closed');
  });
});
