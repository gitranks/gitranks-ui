// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExampleRank } from './example-cards';
import { unsungHero } from '@/lib/unsung-hero/__fixtures__/hero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session } = vi.hoisted(() => ({
  session: {
    current: { data: null, status: 'unauthenticated' } as {
      data: { user: { githubLogin?: string } } | null;
      status: 'unauthenticated' | 'authenticated' | 'loading';
    },
  },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
vi.mock('./use-rank-card', () => ({ useRankCard: () => ({ card: null, state: 'loading' }) }));

const { HeroAside } = await import('./hero-aside');
const { resetPackagesOpen, PACKAGES_OPEN_PATH } = await import('@/lib/packages/packages-open');
const { resetUnsungHero } = await import('@/lib/unsung-hero/use-unsung-hero');
const { UNSUNG_HERO_CURRENT_PATH } = await import('@/lib/unsung-hero/unsung-hero');

const example: ExampleRank = {
  login: 'cy-labs',
  avatarUrl: null,
  location: null,
  flag: null,
  ranking: 's',
  rankings: {
    s: { position: 3, previous: 3, value: 156_000, notCounted: null, rankedCount: 1_657_241, tier: null },
  },
};

describe('HeroAside with Unsung hero', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;
  let open: boolean;
  let hero: unknown;

  const render = async () => {
    await act(async () => {
      root.render(<HeroAside examples={[example]} />);
    });
    return container.innerHTML;
  };
  const asked = (path: string) => fetchMock.mock.calls.filter(([url]) => url === path).length;

  beforeEach(() => {
    // Inside the fixture hero's week, so its answer is kept.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-28T12:00:00.000Z') });
    resetPackagesOpen();
    resetUnsungHero();
    session.current = { data: null, status: 'unauthenticated' };
    open = true;
    hero = unsungHero;
    fetchMock = vi.fn(async (url: string) => {
      if (url === PACKAGES_OPEN_PATH) return new Response(JSON.stringify({ open }));
      if (url === UNSUNG_HERO_CURRENT_PATH) return new Response(JSON.stringify({ hero }));
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows no hero card and asks nothing about the hero while the feature is closed to the viewer', async () => {
    open = false;
    const html = await render();

    expect(html).toContain('aria-label="Example rank card"');
    expect(html).not.toContain('Unsung hero');
    expect(asked(PACKAGES_OPEN_PATH)).toBe(1);
    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(0);
  });

  it('keeps the example cards for a signed-out visitor in a week with no hero', async () => {
    hero = null;
    const html = await render();

    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(1);
    expect(html).toContain('aria-label="Example rank card"');
    expect(html).not.toContain('Unsung hero');
  });

  it("keeps the signed-in visitor's own card in a week with no hero", async () => {
    hero = null;
    session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
    const html = await render();

    expect(html).toContain('Your rank');
    expect(html).not.toContain('Unsung hero');
  });

  it('keeps the cards it had when the hero cannot be read', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === PACKAGES_OPEN_PATH ? new Response(JSON.stringify({ open: true })) : new Response(null, { status: 503 }),
    );
    const html = await render();

    expect(html).toContain('aria-label="Example rank card"');
    expect(html).not.toContain('Unsung hero');
  });

  it("shows the week's hero in place of the example cards to a signed-out visitor", async () => {
    const html = await render();

    expect(html).toContain('aria-label="Unsung hero of the week"');
    expect(html).not.toContain('Example rank card');
    expect(html).toContain('href="/repo/octo-labs/scroll-guard"');
  });

  it("shows the week's hero in place of the signed-in visitor's own card", async () => {
    session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
    const html = await render();

    expect(html).toContain('aria-label="Unsung hero of the week"');
    expect(html).not.toContain('Your rank');
  });

  const remount = async () => {
    act(() => root.unmount());
    root = createRoot(container);
    return render();
  };

  it('asks for the hero once per page load, however often the column is mounted', async () => {
    await render();
    const html = await remount();

    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(1);
    expect(html).toContain('aria-label="Unsung hero of the week"');
  });

  it('asks again on the next mount after a failed ask, and keeps no failure', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ open: true })));
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 503 }));
    expect(await render()).not.toContain('Unsung hero');

    const html = await remount();
    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(2);
    expect(html).toContain('aria-label="Unsung hero of the week"');
  });

  it('asks again once the answer is ten minutes old, or once its week is over', async () => {
    await render();
    vi.setSystemTime(new Date('2026-10-28T12:09:00.000Z'));
    await remount();
    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(1);

    vi.setSystemTime(new Date('2026-10-28T12:11:00.000Z'));
    await remount();
    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(2);

    // The fixture's week ends on Monday, Nov 2: an answer is not kept past it, even if fresh.
    vi.setSystemTime(new Date('2026-11-01T23:55:00.000Z'));
    await remount();
    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(3);
    vi.setSystemTime(new Date('2026-11-02T00:00:01.000Z'));
    await remount();
    expect(asked(UNSUNG_HERO_CURRENT_PATH)).toBe(4);
  });
});
