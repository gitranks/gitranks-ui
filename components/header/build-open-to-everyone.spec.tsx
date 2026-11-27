import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/build/built-parts', async (original) => ({
  ...(await original<typeof import('@/lib/build/built-parts')>()),
  BUILD_OPEN_TO_EVERYONE: true,
}));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const { MainMenu } = await import('./components/main-menu');
const { ProductsBlockLive } = await import('@/app/components/landing/products-block-live');

/*
 * The day Build opens to everyone, one constant (`BUILD_OPEN_TO_EVERYONE`) puts the header's Grow menu and the home
 * page's three cards in the page as the server renders it, for every visitor.
 */
describe('once Build is open to everyone', () => {
  it('serves the header with Grow, Build marked "New", and no Learn or Contribute of their own', () => {
    const html = renderToStaticMarkup(<MainMenu />);
    expect(html).toMatch(/<button [^>]*>Grow/);
    expect(html).toMatch(/href="\/build"[^>]*><span[^>]*>Build<span[^>]*>New<\/span>/);
    expect(html).not.toMatch(/<a [^>]*href="\/contribute"[^>]*>Contribute<\/a>/);
  });

  it("serves the home page's block with three cards, Build's promoting it", () => {
    const html = renderToStaticMarkup(<ProductsBlockLive contribute />);
    expect(html).toContain('Learn, build, and contribute to open source');
    expect([...html.matchAll(/data-home-card="([A-Z]+)"/g)].map(([, product]) => product)).toEqual([
      'LEARN',
      'BUILD',
      'CONTRIBUTE',
    ]);
    expect(html).toContain('Start building');
  });
});
