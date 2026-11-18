// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HERO_CARD_ASK, HERO_CARD_NOTE, UnsungHeroCard } from './unsung-hero-card';
import { unsungHero } from '@/lib/unsung-hero/__fixtures__/hero';
import { resetUnsungHero } from '@/lib/unsung-hero/use-unsung-hero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

describe('UnsungHeroCard', () => {
  it("says the card's two sentences byte for byte", () => {
    expect(HERO_CARD_ASK).toBe('Probably in your app too. A star is a free way to say thanks.');
    expect(HERO_CARD_NOTE).toBe(
      'Our way to back lesser-known maintainers. Nobody pays to be here, nobody gets anything for starring.',
    );
    const html = renderToStaticMarkup(<UnsungHeroCard hero={unsungHero} />);
    expect(html).toContain(`>${HERO_CARD_ASK}<`);
    expect(html).toContain(`>${HERO_CARD_NOTE}<`);
  });

  it('draws the week, the repository, its line, its figures and the stars since Monday', () => {
    const html = renderToStaticMarkup(<UnsungHeroCard hero={unsungHero} />);
    const words = text(html);

    expect(words).toContain('Unsung hero · Oct 26 – Nov 1');
    expect(html).toContain('href="/unsung-heroes"');
    expect(html).toContain('href="/repo/octo-labs/scroll-guard"');
    expect(words).toContain('octo-labs/scroll-guard Ships inside @octo-ui/dialog');
    expect(words).toContain('98.8M downloads a week');
    expect(words).toContain('942 stars');
    expect(words).toContain('+51 since Monday');
  });

  it('stars on GitHub with a plain link in a new tab', () => {
    const html = renderToStaticMarkup(<UnsungHeroCard hero={unsungHero} />);

    expect(html).toMatch(
      /<a [^>]*href="https:\/\/github\.com\/octo-labs\/scroll-guard"[^>]*target="_blank"[^>]*>.*Star on GitHub<\/a>/,
    );
  });

  it('leaves the stars out when they were not read, and shows +0 in a week with none yet', () => {
    const words = text(
      renderToStaticMarkup(<UnsungHeroCard hero={{ ...unsungHero, starsAtStart: null, starsGained: 0 }} />),
    );

    expect(words).not.toMatch(/\d stars/);
    expect(words).toContain('+0 since Monday');
  });

  describe('a press of Star on GitHub', () => {
    let container: HTMLDivElement;
    let root: Root;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      resetUnsungHero();
      fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);
      container = document.createElement('div');
      root = createRoot(container);
    });

    afterEach(() => {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    });

    it('reports the hit once per page load, naming the repository', async () => {
      await act(async () => {
        root.render(<UnsungHeroCard hero={unsungHero} />);
      });
      const link = [...container.querySelectorAll('a')].find((a) => a.textContent?.includes('Star on GitHub'));
      link?.addEventListener('click', (event) => event.preventDefault());
      act(() => link?.click());
      act(() => link?.click());

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/unsung-hero/hit');
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ kind: 'github', repo: 'octo-labs/scroll-guard' });
    });
  });
});
