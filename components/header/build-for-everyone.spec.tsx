// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildInProgress } from '@/lib/build/__fixtures__/builds';

const session = vi.hoisted(() => ({
  current: { data: null, status: 'unauthenticated' } as { data: unknown; status: string },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
const hint = vi.hoisted(() => ({ present: false }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { MainMenu } = await import('./components/main-menu');
const { ProductsBlockLive } = await import('@/app/components/landing/products-block-live');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* The header's Grow menu and the home page's three cards are in the page as the server renders it, for every visitor. */
describe('Build for everyone', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves the header with Grow, Build marked "New", and no Learn or Contribute of their own', () => {
    const html = renderToStaticMarkup(<MainMenu />);
    expect(html).toMatch(/<button [^>]*>Grow/);
    expect(html).toMatch(/href="\/build"[^>]*><span[^>]*>Build<span[^>]*>New<\/span>/);
    expect(html).not.toMatch(/<a [^>]*href="\/contribute"[^>]*>Contribute<\/a>/);
  });

  it("serves the home page's block with three cards, Build's promoting it", async () => {
    const { prelude } = await prerender(<ProductsBlockLive contribute />);
    const html = await new Response(prelude).text();
    expect(html).toContain('Learn, build, and contribute to open source');
    expect([...html.matchAll(/data-home-card="([A-Z]+)"/g)].map(([, product]) => product)).toEqual([
      'LEARN',
      'BUILD',
      'CONTRIBUTE',
    ]);
    expect(html).toContain('Start building');
  });

  it("changes Build's card once for a person with a build: from the promotion to their own card", async () => {
    hint.present = true;
    session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
    let releaseHome: (() => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/me/build/bar') return Response.json({ bar: { hasBuild: true, tests: null } });
        if (url === '/api/me/build/home') {
          await new Promise<void>((resolve) => (releaseHome = resolve));
          return Response.json({ home: { builds: [buildInProgress], tests: [], next: [] } });
        }
        if (url === '/api/me/build/projects') return Response.json({ builds: [] });
        return new Response('not here', { status: 404 });
      }),
    );
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const buildCard = () => container.querySelector('[data-home-card="BUILD"]')?.textContent ?? '';
    await act(async () => root.render(<ProductsBlockLive contribute />));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    // The bar has answered that the person has a build, but the card is not read yet: still the promotion.
    expect(buildCard()).toContain('Start building');
    expect(buildCard()).not.toContain('Open Build');
    await act(async () => releaseHome?.());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(buildCard()).toContain('Build an MCP server: step 9 of 16');
    await act(async () => root.unmount());
    container.remove();
  });
});
