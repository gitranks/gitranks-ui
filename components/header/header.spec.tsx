import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ signIn: vi.fn(), signOut: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/components/signin-button/signin-button', () => ({ default: () => <span data-sign-in-button /> }));

const { Header } = await import('./header');
const { MainMenu } = await import('./components/main-menu');

const RANKINGS = ['/by/stars/1', '/languages/global/score/1', '/countries/stars/1', '/orgs/1', '/repos/1'];

describe('the main menu', () => {
  it('is the Rankings submenu and Badges, in the row from sm up and in a closed panel under a menu button below it', () => {
    const html = renderToStaticMarkup(<MainMenu />);
    const toggle = html.match(/<button [^>]*>/)?.[0] ?? '';
    const panel = toggle.match(/aria-controls="([^"]+)"/)?.[1];

    expect(html).toMatch(/^<nav aria-label="Main"[^>]*class="[^"]*max-sm:\[&amp;&gt;div\]:static!"/);
    expect(toggle).toContain('aria-expanded="false"');
    expect(toggle).toContain('aria-label="Open menu"');
    expect(toggle).toContain('sm:hidden');
    expect(html).toMatch(
      new RegExp(
        `<ul [^>]*class="[^"]*max-sm:absolute max-sm:top-full max-sm:right-0[^"]*max-sm:hidden" id="${panel}"`,
      ),
    );
    expect(html).toMatch(/<button [^>]*data-state="closed"[^>]*>Rankings/);
    // Rankings' links are in the server HTML for crawlers, hidden while the submenu is closed.
    for (const href of RANKINGS) expect(html).toContain(`href="${href}"`);
    expect(html).toMatch(/<a [^>]*href="\/badge\/gallery">Badges<\/a>/);
    // Contribute is offered only to a signed-in user it is open to.
    expect(html).not.toContain('href="/contribute"');
  });
});

describe('the header', () => {
  it('shows the logo, the main menu and the sign-in by default', () => {
    const html = renderToStaticMarkup(<Header />);

    expect(html).toContain('<a class="shrink-0" href="/">');
    expect(html).toContain('<nav aria-label="Main"');
    expect(html).toContain('data-sign-in-button');
    expect(html).not.toContain('>/</span>');
  });

  it('titles a page after the logo and a "/", the logo giving way to a home icon on a phone', () => {
    const html = renderToStaticMarkup(<Header title="torvalds" />);

    expect(html).toMatch(/<svg [^>]*class="[^"]*h-\[22px\] sm:block hidden"/);
    expect(html).toContain('lucide-house');
    expect(html).toMatch(/<\/a><span[^>]*>\/<\/span><span[^>]*>torvalds<\/span>/);
    expect(html).toContain('<nav aria-label="Main"');
  });

  it('takes a menu and an account in place of its own, and null for none', () => {
    const own = renderToStaticMarkup(<Header menu={<nav aria-label="Own" />} account={<span data-own-account />} />);
    expect(own).toContain('<nav aria-label="Own"');
    expect(own).toContain('data-own-account');
    expect(own).not.toContain('aria-label="Main"');
    expect(own).not.toContain('data-sign-in-button');

    const bare = renderToStaticMarkup(<Header menu={null} account={null} />);
    expect(bare).not.toContain('<nav');
    expect(bare).not.toContain('data-sign-in-button');
  });
});
