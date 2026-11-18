// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Uncounted } from './components/uncounted';
import { UnsungHeroCard } from '@/app/components/landing/unsung-hero-card';
import { unsungHero } from '@/lib/unsung-hero/__fixtures__/hero';
import { resetUnsungHero } from '@/lib/unsung-hero/use-unsung-hero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Clicks the card's Star on GitHub, with or without the preview's wrapper; answers what was sent to be counted. */
async function pressStar(wrapped: boolean) {
  resetUnsungHero();
  const fetch = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  // jsdom cannot open a new tab: the link's own action is kept from running.
  const stay = (event: Event) => event.preventDefault();
  window.addEventListener('click', stay, true);

  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const card = <UnsungHeroCard hero={unsungHero} />;
  await act(async () => root.render(wrapped ? <Uncounted>{card}</Uncounted> : card));
  const star = [...host.querySelectorAll('a')].find((a) => a.textContent?.includes('Star on GitHub'));
  await act(async () => star?.click());

  await act(async () => root.unmount());
  host.remove();
  window.removeEventListener('click', stay, true);
  return fetch.mock.calls.length;
}

afterEach(() => vi.unstubAllGlobals());

describe('Uncounted, around the preview of the home card', () => {
  it('keeps a press of Star on GitHub from being counted', async () => {
    expect(await pressStar(false)).toBe(1);
    expect(await pressStar(true)).toBe(0);
  });
});
