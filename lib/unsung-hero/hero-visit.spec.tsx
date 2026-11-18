// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { unsungHero } from './__fixtures__/hero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gate } = vi.hoisted(() => ({ gate: { open: true } }));
vi.mock('@/lib/packages/packages-open', () => ({ usePackagesOpen: () => gate.open }));

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
    gate.open = true;
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

  it('asks nothing while the feature is closed to the viewer', async () => {
    gate.open = false;
    await render('octo-labs', 'scroll-guard');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
