// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { homeProducts } from './__fixtures__/products-block';

const session = vi.hoisted(() => ({
  current: { data: null, status: 'unauthenticated' } as { data: unknown; status: string },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));

const { HOME_PRODUCTS_WAIT_MS, ProductsBlockLive } = await import('./products-block-live');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = vi.fn();
let container: HTMLDivElement;
let root: Root;

const signIn = () => {
  session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
};
const answer = (body: unknown, ok = true) => ({ ok, json: async () => body });
const card = (product: string) => container.querySelector<HTMLAnchorElement>(`[data-home-card="${product}"]`);
const render = () => act(async () => root.render(<ProductsBlockLive contribute />));

beforeEach(() => {
  session.current = { data: null, status: 'unauthenticated' };
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const expectPromotions = () => {
  expect(card('CONTRIBUTE')?.textContent).toContain('Start contributing');
  expect(card('LEARN')?.textContent).toContain('Start learning');
  expect(container.querySelectorAll('[data-personal]')).toHaveLength(0);
};

describe('ProductsBlockLive', () => {
  it('serves the three promotions with the page, asking nothing while it is drawn ahead of a request', () => {
    signIn();
    const html = renderToStaticMarkup(<ProductsBlockLive contribute />);
    expect(html).toContain('Fix issues in the open source you build on');
    expect(html).toContain('Learn one idea in two minutes');
    expect(html).toContain('Start building');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves out Contribute's card until Contribute is launched", () => {
    const html = renderToStaticMarkup(<ProductsBlockLive contribute={false} />);
    expect(html).not.toContain('data-home-card="CONTRIBUTE"');
    expect(html).toContain('data-home-card="LEARN"');
  });

  it('asks nothing for a visitor, or while the session loads', async () => {
    await render();
    session.current = { data: null, status: 'loading' };
    await render();
    expect(fetchMock).not.toHaveBeenCalled();
    expectPromotions();
  });

  it("changes a signed-in person's cards in place once read", async () => {
    signIn();
    fetchMock.mockResolvedValueOnce(answer({ products: homeProducts.both }));
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/me/home-products');
    expect(card('CONTRIBUTE')?.textContent).toContain('2 pull requests need you');
    expect(card('CONTRIBUTE')?.getAttribute('href')).toBe('/my/pull-requests');
    expect(card('LEARN')?.textContent).toContain('6 lessons to repeat today');
    // Build's card promotes: a browser with no session hint reads nothing of Build.
    expect(card('BUILD')?.textContent).toContain('Start building');
    expect(container.querySelectorAll('a')).toHaveLength(3);
    expect(container.querySelectorAll('[data-personal]')).toHaveLength(2);
  });

  it('keeps the promotions when the read fails, answers none, or is refused', async () => {
    signIn();
    for (const reply of [
      () => Promise.reject(new Error('offline')),
      () => Promise.resolve(answer({ products: null })),
      () => Promise.resolve(answer({}, false)),
    ]) {
      fetchMock.mockImplementationOnce(reply);
      act(() => root.unmount());
      root = createRoot(container);
      await render();
      expectPromotions();
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('keeps the promotions when the read is slow', async () => {
    vi.useFakeTimers();
    signIn();
    let signal: AbortSignal | undefined;
    let reply: (value: unknown) => void = () => {};
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise((resolve) => {
        reply = resolve;
      });
    });
    await render();
    await act(async () => vi.advanceTimersByTime(HOME_PRODUCTS_WAIT_MS));
    expect(signal?.aborted).toBe(true);
    await act(async () => reply(answer({ products: homeProducts.both })));
    expectPromotions();
  });
});
