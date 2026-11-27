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
const { ProductsBlockGrow } = await import('./products-block');
const { resetBuildViewer } = await import('@/components/build/build-viewer');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Side = { open: boolean; hasBuild?: boolean; home?: BuildHome | null; builds?: BuildMine[] | null };

/** The routes as the browser reads them: Build's for the person, and the two cards of Learn and Contribute. */
const routes = ({ open, hasBuild = true, home = null, builds = null }: Side) =>
  vi.fn(async (url: string) => {
    if (url === '/api/me/build/open') return Response.json({ open });
    if (url === '/api/me/build/bar') return Response.json({ bar: { hasBuild, tests: null } });
    if (url === '/api/me/build/home') return Response.json({ home });
    if (url === '/api/me/build/projects') return Response.json({ builds });
    if (url === '/api/me/home-products') return Response.json({ products: homeProducts.both });
    return new Response('not here', { status: 404 });
  });

const home = (fields: Partial<BuildHome>): BuildHome => ({ builds: [], tests: [], next: [], ...fields });

describe("the home page's block with Build's card", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetBuildViewer();
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
  });

  const render = () => act(async () => root.render(<ProductsBlockLive contribute />));
  const cards = () => [...container.querySelectorAll<HTMLAnchorElement>('[data-home-card]')];
  const order = () => cards().map((card) => card.dataset.homeCard);
  const card = (product: string) => container.querySelector<HTMLAnchorElement>(`[data-home-card="${product}"]`);
  /** A card's words as shown: the layer kept for its size is hidden from sight and screen readers. */
  const shown = (product: string) => {
    const copy = card(product)?.cloneNode(true) as HTMLElement | undefined;
    for (const layer of copy?.querySelectorAll('[data-promo-layer]') ?? []) layer.remove();
    return copy?.textContent ?? '';
  };

  it("keeps today's block for a person Build is not open to", async () => {
    vi.stubGlobal('fetch', routes({ open: false }));
    await render();
    expect(order()).toEqual(['CONTRIBUTE', 'LEARN']);
    expect(container.textContent).not.toContain('GitRanks Build');
  });

  it('draws three cards, Learn, Build, Contribute, under the heading with all three', async () => {
    vi.stubGlobal('fetch', routes({ open: true, hasBuild: false, home: home({}), builds: [] }));
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
      routes({ open: true, home: home({ builds: [buildInProgress], tests: [keyValueDatabaseEndTest] }), builds: [] }),
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
    vi.stubGlobal('fetch', routes({ open: true, home: home({ tests: [webServerGoldTest] }), builds: [] }));
    await render();
    expect(shown('BUILD')).toContain('Your gold test is open');

    await act(async () => root.unmount());
    root = createRoot(container);
    resetBuildViewer();
    vi.stubGlobal(
      'fetch',
      routes({ open: true, home: home({ builds: [buildInProgress, keyValueDatabaseInProgress] }), builds: [] }),
    );
    await render();
    expect(shown('BUILD')).toBe(
      'GitRanks BuildBuild an MCP server: step 9 of 16Next: Check the input. And 1 more build in progress.Open your builds',
    );
  });

  it('counts the projects built and names the next one', async () => {
    vi.stubGlobal('fetch', routes({ open: true, home: sideNothingWaits.home, builds: sideNothingWaits.builds }));
    await render();
    expect(shown('BUILD')).toBe(
      'GitRanks Build2 projects builtNext for you: Build a coding agent.Pick your next project',
    );
  });

  it("changes once: today's block stays until both Build's answer and its card are read", async () => {
    let releaseHome: (() => void) | undefined;
    const base = routes({ open: true, home: home({ builds: [buildInProgress] }), builds: [] });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/me/build/home') await new Promise<void>((resolve) => (releaseHome = resolve));
        return base(url);
      }),
    );
    await render();
    expect(order()).toEqual(['CONTRIBUTE', 'LEARN']);
    await act(async () => releaseHome?.());
    expect(order()).toEqual(['LEARN', 'BUILD', 'CONTRIBUTE']);
    expect(shown('BUILD')).toContain('Build an MCP server: step 9 of 16');
  });

  it("promotes Build when its card's reads fail, and keeps Contribute for someone who uses it before it is launched", async () => {
    vi.stubGlobal('fetch', routes({ open: true, hasBuild: false, home: null, builds: null }));
    await act(async () => root.render(<ProductsBlockLive contribute={false} />));
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
