// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HOME_NOW, homeProducts } from './__fixtures__/products-block';
import {
  buildInProgress,
  keyValueDatabaseEndTest,
  keyValueDatabaseInProgress,
  webServerGoldTest,
} from '@/lib/build/__fixtures__/builds';
import { sideNothingWaits } from '@/lib/build/__fixtures__/home';
import type { BuildHome, BuildMine } from '@/lib/build/types';

const session = vi.hoisted(() => ({
  current: { data: null, status: 'unauthenticated' } as { data: unknown; status: string },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { ProductsBlockLive } = await import('./products-block-live');
const { ProductsBlockGrow } = await import('./products-block-grow');
const { resetBuildViewer } = await import('@/components/build/build-viewer');
const { BUILD_CARD_WAIT_MS, forgetBuildCardRead } = await import('@/components/build/home-card-live');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Side = { hasBuild?: boolean; home?: BuildHome | null; builds?: BuildMine[] | null };

/** The routes as the browser reads them: Build's for the person, and the two cards of Learn and Contribute. */
const routes = ({ hasBuild = true, home = null, builds = null }: Side = {}) =>
  vi.fn(async (url: string) => {
    if (url === '/api/me/build/bar') return Response.json({ bar: { hasBuild, tests: null } });
    if (url === '/api/me/build/home') return Response.json({ home });
    if (url === '/api/me/build/projects') return Response.json({ builds });
    if (url === '/api/me/home-products') return Response.json({ products: homeProducts.both });
    return new Response('not here', { status: 404 });
  });

const home = (fields: Partial<BuildHome>): BuildHome => ({ builds: [], tests: [], next: [], ...fields });

/** Lets every answer in flight land, and the block's code load. */
const settle = () =>
  act(async () => {
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
    else await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe("the home page's block with Build's card", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetBuildViewer();
    forgetBuildCardRead();
    hint.present = true;
    session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const render = async () => {
    await act(async () => root.render(<ProductsBlockLive contribute />));
    await settle();
  };
  /** The block drawn again in the same document, as on a return to the home page. */
  const drawAgain = async () => {
    await act(async () => root.unmount());
    root = createRoot(container);
  };
  const cards = () => [...container.querySelectorAll<HTMLAnchorElement>('[data-home-card]')];
  const order = () => cards().map((card) => card.dataset.homeCard);
  const card = (product: string) => container.querySelector<HTMLAnchorElement>(`[data-home-card="${product}"]`);
  /** A card's words as shown: the layer kept for its size is hidden from sight and screen readers. */
  const shown = (product: string) => {
    const copy = card(product)?.cloneNode(true) as HTMLElement | undefined;
    for (const layer of copy?.querySelectorAll('[data-promo-layer]') ?? []) layer.remove();
    return copy?.textContent ?? '';
  };

  it('draws three cards, Learn, Build, Contribute, under the heading with all three', async () => {
    vi.stubGlobal('fetch', routes({ hasBuild: false, home: home({}), builds: [] }));
    await render();
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(container.querySelector('h2')?.textContent).toBe('Learn, build, and contribute to open source');
    expect(container.querySelector('p')?.textContent).toBe('All three work with your own coding agent, on real code.');
    expect(container.querySelector('section')?.dataset.productsBlock).toBe('grow');
    expect(container.querySelector('.grid')?.className).toContain('lg:grid-cols-3');
    // Build promotes, with "New"; Learn's and Contribute's say what they say today, for this person.
    expect(shown('BUILD')).toBe(
      'GitRanks BuildNewBuild a real thing, step by stepPick a project, like an MCP server or a key-value database. Your coding agent writes it with you, one step at a time.Start building',
    );
    expect(card('BUILD')?.getAttribute('href')).toBe('/build');
    expect(shown('LEARN')).toContain('6 lessons to repeat today');
    expect(shown('CONTRIBUTE')).toContain('2 pull requests need you');
  });

  it('says a test waits, then the gold test, then the build in progress', async () => {
    vi.stubGlobal(
      'fetch',
      routes({ home: home({ builds: [buildInProgress], tests: [keyValueDatabaseEndTest] }), builds: [] }),
    );
    await render();
    expect(shown('BUILD')).toBe(
      'GitRanks BuildYour test is waitingBuild a key-value database: 10 questions, about 3 minutes.Take the test',
    );
    expect(card('BUILD')?.getAttribute('href')).toBe('/build/key-value-database/test?language=python');
    expect(card('BUILD')?.hasAttribute('data-personal')).toBe(true);

    await act(async () => root.unmount());
    root = createRoot(container);
    resetBuildViewer();
    forgetBuildCardRead();
    vi.stubGlobal('fetch', routes({ home: home({ tests: [webServerGoldTest] }), builds: [] }));
    await render();
    expect(shown('BUILD')).toContain('Your gold test is open');

    await act(async () => root.unmount());
    root = createRoot(container);
    resetBuildViewer();
    forgetBuildCardRead();
    vi.stubGlobal(
      'fetch',
      routes({ home: home({ builds: [buildInProgress, keyValueDatabaseInProgress] }), builds: [] }),
    );
    await render();
    expect(shown('BUILD')).toBe(
      'GitRanks BuildBuild an MCP server: step 9 of 16Next: Check the input. And 1 more build in progress.Open your builds',
    );
  });

  it('counts the projects built and names the next one', async () => {
    vi.stubGlobal('fetch', routes({ home: sideNothingWaits.home, builds: sideNothingWaits.builds }));
    await render();
    expect(shown('BUILD')).toBe(
      'GitRanks Build2 projects builtNext for you: Build a coding agent.Pick your next project',
    );
  });

  it("changes Build's card once: it promotes until the person's card is read", async () => {
    let releaseHome: (() => void) | undefined;
    const base = routes({ home: home({ builds: [buildInProgress] }), builds: [] });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/me/build/home') await new Promise<void>((resolve) => (releaseHome = resolve));
        return base(url);
      }),
    );
    await render();
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(shown('BUILD')).toContain('Start building');
    await act(async () => releaseHome?.());
    await settle();
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(shown('BUILD')).toContain('Build an MCP server: step 9 of 16');
  });

  it('settles at the end of the wait, Build promoting, when its card is not read by then', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const signals: AbortSignal[] = [];
    const base = routes({ hasBuild: false });
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url !== '/api/me/build/home') return base(url);
        if (init?.signal) signals.push(init.signal);
        return new Promise<Response>(() => {});
      }),
    );
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(BUILD_CARD_WAIT_MS - 1));
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await settle();
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(shown('BUILD')).toContain('Start building');
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('draws the three cards at once back on the home page, and changes their words in place once read', async () => {
    vi.stubGlobal('fetch', routes({ home: home({ tests: [keyValueDatabaseEndTest] }), builds: [] }));
    await render();
    expect(shown('BUILD')).toContain('Your test is waiting');

    await drawAgain();
    let releaseHome: (() => void) | undefined;
    const base = routes({ home: home({ tests: [webServerGoldTest] }), builds: [] });
    const fetch = vi.fn(async (url: string) => {
      if (url === '/api/me/build/home') await new Promise<void>((resolve) => (releaseHome = resolve));
      return base(url);
    });
    vi.stubGlobal('fetch', fetch);
    act(() => root.render(<ProductsBlockLive contribute />));
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(shown('BUILD')).toContain('Your test is waiting');
    await settle();
    await act(async () => releaseHome?.());
    await settle();
    expect(shown('BUILD')).toContain('Your gold test is open');
    // The bar is kept for the document: only the card is read again.
    expect(fetch.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/me/build/'))).toEqual([
      '/api/me/build/home',
      '/api/me/build/projects',
    ]);
  });

  it("promotes Build when its card's reads fail, and keeps Contribute for someone who uses it before it is launched", async () => {
    vi.stubGlobal('fetch', routes({ hasBuild: false, home: null, builds: null }));
    await act(async () => root.render(<ProductsBlockLive contribute={false} />));
    await settle();
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(shown('BUILD')).toContain('Start building');
  });

  it('draws Learn and Build alone for someone who does not use Contribute before it is launched', async () => {
    await act(async () =>
      root.render(<ProductsBlockGrow products={homeProducts.learner} now={HOME_NOW} contribute={false} />),
    );
    expect(order()).toEqual(['LEARN', 'BUILD']);
    expect(container.querySelector('h2')?.textContent).toBe('Learn and build with your own coding agent');
    expect(container.querySelector('.grid')?.className).toContain('md:grid-cols-2');
  });

  it('keeps every card the size of its promotion', async () => {
    await act(async () =>
      root.render(
        <ProductsBlockGrow
          products={null}
          build={{ home: home({ builds: [buildInProgress] }), builds: [], hasBuild: true }}
          now={HOME_NOW}
        />,
      ),
    );
    const layer = card('BUILD')?.querySelector('[data-promo-layer]');
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    expect(layer?.textContent).toBe('Build a real thing, step by step');
  });
});
