import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/profile/octocat/repositories' }));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));

const { Tab } = await import('./tabs');

const PENDING_HINT =
  '<span aria-hidden="true" class="absolute inset-x-0 -bottom-0.5 h-0.5 bg-foreground opacity-0 transition-opacity"></span>';

/** The link's text content: what is left of its markup once the tags are gone. */
const textOfLink = (html: string) => (html.match(/<a [^>]*>(.*)<\/a>/)?.[1] ?? '').replace(/<[^>]+>/g, '');

describe('Tab', () => {
  it('draws the label alone without a count, on the open tab and on the others', () => {
    expect(renderToStaticMarkup(<Tab href="/profile/octocat/ranks">Ranks</Tab>)).toBe(
      '<li class="shrink-0 sm:me-2"><a class="relative inline-block whitespace-nowrap px-3 pb-4 sm:px-4 border-b-2 rounded-t-lg border-transparent hover:border-muted-foreground" href="/profile/octocat/ranks">' +
        `Ranks${PENDING_HINT}</a></li>`,
    );
    expect(renderToStaticMarkup(<Tab href="/profile/octocat/repositories">Repositories</Tab>)).toBe(
      '<li class="shrink-0 sm:me-2"><a aria-current="page" class="relative inline-block whitespace-nowrap px-3 pb-4 sm:px-4 border-b-2 rounded-t-lg border-foreground text-foreground font-semibold" href="/profile/octocat/repositories">' +
        `Repositories${PENDING_HINT}</a></li>`,
    );
  });

  it('puts the count after the label in a small pill: mono, tabular, with separators, muted', () => {
    const html = renderToStaticMarkup(
      <Tab href="/profile/octocat/ranks" count={12345}>
        Ranks
      </Tab>,
    );
    expect(html).toContain(
      'Ranks <span data-tab-count="" class="ms-0.5 rounded-full bg-muted px-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">12,345</span>' +
        PENDING_HINT,
    );
  });

  it('keeps a space between the label and the count in the text of the link, so they are read as two words', () => {
    const html = renderToStaticMarkup(
      <Tab href="/profile/octocat/ranks" count={12345}>
        Ranks
      </Tab>,
    );
    expect(textOfLink(html)).toBe('Ranks 12,345');
    expect(textOfLink(renderToStaticMarkup(<Tab href="/profile/octocat/ranks">Ranks</Tab>))).toBe('Ranks');
  });

  it("keeps the count in the open tab's text colour, and shows a zero", () => {
    const html = renderToStaticMarkup(
      <Tab href="/profile/octocat/repositories" count={0}>
        Repositories
      </Tab>,
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toMatch(/<span data-tab-count="" class="[^"]* text-foreground">0<\/span>/);
    expect(html).not.toContain('text-muted-foreground');
  });
});
