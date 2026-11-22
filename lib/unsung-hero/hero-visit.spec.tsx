// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { unsungHero } from './__fixtures__/hero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { HeroVisit } = await import('./hero-visit');
const { resetUnsungHero } = await import('./use-unsung-hero');
const { UNSUNG_HERO_CURRENT_PATH, UNSUNG_HERO_HIT_PATH } = await import('./unsung-hero');

describe('HeroVisit', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;
  let hero: unknown;

  const render = async (owner: string, name: string) => {
    await act(async () => {
      root.render(<HeroVisit owner={owner} name={name} />);
    });
    return container.innerHTML;
  };
  const hits = () =>
    fetchMock.mock.calls
      .filter(([url]) => url === UNSUNG_HERO_HIT_PATH)
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)));

  beforeEach(() => {
    // Inside the fixture hero's week, so its answer is kept.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-28T12:00:00.000Z') });
    resetUnsungHero();
    hero = unsungHero;
    fetchMock = vi.fn(async (url: string) =>
      url === UNSUNG_HERO_CURRENT_PATH
        ? new Response(JSON.stringify({ hero }))
        : new Response(null, { status: url === UNSUNG_HERO_HIT_PATH ? 204 : 404 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("counts a visit of the hero's own repository page, in any letter case, and draws nothing", async () => {
    expect(await render('OCTO-labs', 'Scroll-Guard')).toBe('');
    expect(hits()).toEqual([{ kind: 'visit', repo: 'OCTO-labs/Scroll-Guard' }]);
  });

  it('counts it once per page load, however often the page is mounted', async () => {
    await render('octo-labs', 'scroll-guard');
    act(() => root.unmount());
    root = createRoot(container);
    await render('octo-labs', 'scroll-guard');

    expect(hits()).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === UNSUNG_HERO_CURRENT_PATH)).toHaveLength(1);
  });

  it("reports nothing on any other repository's page", async () => {
    await render('octo-labs', 'focus-guard');
    await render('vercel', 'next.js');

    expect(hits()).toEqual([]);
  });

  it('reports nothing in a week with no hero', async () => {
    hero = null;
    await render('octo-labs', 'scroll-guard');

    expect(hits()).toEqual([]);
  });

  const asked = () => fetchMock.mock.calls.filter(([url]) => url === UNSUNG_HERO_CURRENT_PATH).length;
  const remount = async () => {
    act(() => root.unmount());
    root = createRoot(container);
    await render('vercel', 'next.js');
  };

  it('asks for the hero again on the next mount after a failed ask, and keeps no failure', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 503 }));
    await render('vercel', 'next.js');
    await remount();
    expect(asked()).toBe(2);
  });

  it('asks again once the answer is ten minutes old, or once its week is over', async () => {
    await render('vercel', 'next.js');
    vi.setSystemTime(new Date('2026-10-28T12:09:00.000Z'));
    await remount();
    expect(asked()).toBe(1);

    vi.setSystemTime(new Date('2026-10-28T12:11:00.000Z'));
    await remount();
    expect(asked()).toBe(2);

    // The fixture's week ends on Monday, Nov 2: an answer is not kept past it, even if fresh.
    vi.setSystemTime(new Date('2026-11-01T23:55:00.000Z'));
    await remount();
    expect(asked()).toBe(3);
    vi.setSystemTime(new Date('2026-11-02T00:00:01.000Z'));
    await remount();
    expect(asked()).toBe(4);
  });
});
