// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FollowSlotProps } from './follow-slot';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, gate } = vi.hoisted(() => ({
  session: { current: { data: null } as { data: unknown } },
  gate: { open: true },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
vi.mock('@/lib/packages/packages-open', () => ({ usePackagesOpen: () => gate.open }));

const { FollowSlot } = await import('./follow-slot');
const { LINK_PAGES } = await import('@/lib/link-token/link-token');

const ALL = { notable: true, digest: true, milestones: true };
const one: FollowSlotProps['packages'] = [{ registry: 'npm', name: 'react-resize-detector' }];
const option = (channel: string, over: Record<string, unknown> = {}) => ({
  channel,
  open: true,
  limit: 20,
  linked: null,
  addressHint: null,
  rankUpdates: null,
  ...over,
});
const visitorChannels = {
  channels: [option('email', { limit: 50 }), option('telegram'), option('whatsapp', { open: false, limit: 3 })],
  dependents: 16,
  notable: 4,
};

type Route = (body: unknown, url: string) => unknown;

describe('FollowSlot', () => {
  let container: HTMLDivElement;
  let root: Root;
  let routes: Record<string, Route>;
  let fetchMock: ReturnType<typeof vi.fn>;

  const render = async (props: Partial<FollowSlotProps> = {}) => {
    await act(async () => {
      root.render(<FollowSlot packages={one} label="react-resize-detector" placement="package-page" {...props} />);
    });
  };
  const calls = (path: string) =>
    fetchMock.mock.calls.filter(([url]) => String(url).startsWith(path)) as [string, RequestInit | undefined][];
  const bodyOf = (path: string, at = 0) => JSON.parse(calls(path)[at][1]?.body as string);
  const dialog = () => document.body.querySelector('[role="dialog"]') as HTMLElement | null;
  const button = (text: string, scope: ParentNode = document.body) =>
    [...scope.querySelectorAll('button, a')].find((el) => el.textContent?.trim() === text) as HTMLElement | undefined;
  const click = async (el: Element | null | undefined) => {
    expect(el).toBeTruthy();
    await act(async () => {
      (el as HTMLElement).click();
    });
  };
  const type = async (input: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const openDialog = async (text = 'Follow') => {
    await click(button(text, container));
    await act(async () => {});
  };
  const row = (channel: string) => dialog()?.querySelector(`[data-channel="${channel}"]`) as HTMLElement | null;

  beforeEach(() => {
    gate.open = true;
    session.current = { data: null };
    routes = {
      '/api/follow/channels': () => visitorChannels,
      '/api/follow/state': () => ({ follows: [] }),
      '/api/follow/start': () => ({ refusal: null, notHeld: [], results: [] }),
      '/api/follow/change': () => ({ follow: null }),
    };
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const path = Object.keys(routes).find((start) => url.startsWith(start));
      if (!path) return new Response(null, { status: 404 });
      return Response.json(routes[path](init?.body ? JSON.parse(init.body as string) : null, url));
    });
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('draws nothing, and asks nothing, for a viewer package pages are hidden from', async () => {
    gate.open = false;
    for (const placement of ['package-page', 'used-by', 'used-by-empty'] as const) {
      await render({ placement });
      expect(container.innerHTML).toBe('');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('draws the button and its line on a package page, asking a visitor nothing', async () => {
    await render();
    expect(button('Follow', container)).toBeTruthy();
    expect(container.textContent).toContain('Get a message when a 1,000+ star repository starts using it');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('draws the Used by card and the empty state’s button with the label', async () => {
    await render({ placement: 'used-by', label: 'nebula/ui packages' });
    expect(container.textContent).toContain('Know when a big project starts using it');
    expect(button('Follow nebula/ui packages', container)).toBeTruthy();

    await render({ placement: 'used-by-empty', label: '@nebula/ui' });
    expect(button('Follow @nebula/ui', container)).toBeTruthy();
  });

  it('says Following to a signed-in viewer who follows the packages, asked once', async () => {
    session.current = { data: { user: { githubLogin: 'octocat', email: 'octo@example.com' } } };
    routes['/api/follow/state'] = () => ({
      follows: [{ id: 'f1', channel: 'telegram', package: one[0], status: 'active', events: ALL }],
    });

    await render();

    expect(button('Following', container)).toBeTruthy();
    expect(calls('/api/follow/state')).toHaveLength(1);
    expect(bodyOf('/api/follow/state')).toEqual({ packages: one });
  });

  describe('the dialog', () => {
    it('offers a visitor the open channels, with the dependents of the one package', async () => {
      await render();
      await openDialog();

      expect(dialog()?.textContent).toContain('Follow react-resize-detector');
      expect(calls('/api/follow/channels')[0][0]).toBe('/api/follow/channels?package=react-resize-detector');
      expect(dialog()?.textContent).toContain('Right away. Today 4 of its 16 dependents have 1,000+ stars.');
      expect(row('email')?.querySelector('input')).toBeTruthy();
      expect(row('telegram')?.textContent).toContain('Not connected');
      // A closed channel is not drawn.
      expect(row('whatsapp')).toBeNull();
    });

    it('links Settings to the email settings page, which the site has', async () => {
      await render();
      await openDialog();

      const settings = button('Settings', dialog() ?? document.body) as HTMLAnchorElement;
      expect(settings.getAttribute('href')).toBe(LINK_PAGES.settings);
      expect(existsSync(join(process.cwd(), 'app', LINK_PAGES.settings, 'page.tsx'))).toBe(true);
    });

    it('sends a visitor’s email follow and asks them to check their inbox', async () => {
      routes['/api/follow/start'] = () => ({
        refusal: null,
        notHeld: [],
        results: [{ channel: 'email', package: one[0], result: 'pending', url: null, limit: null }],
      });
      await render();
      await openDialog();

      const follow = button('Follow', dialog() ?? document.body) as HTMLButtonElement;
      expect(follow.disabled).toBe(true);
      await type(row('email')?.querySelector('input') as HTMLInputElement, 'me@example.com');
      expect(follow.disabled).toBe(false);
      await click(follow);

      expect(bodyOf('/api/follow/start')).toEqual({
        packages: one,
        events: ALL,
        channels: ['email'],
        email: 'me@example.com',
      });
      expect(dialog()?.textContent).toContain('Check your inbox to confirm');
    });

    it('gives Telegram’s link when a visitor connects it', async () => {
      const url = 'https://t.me/somebot?start=f_code';
      routes['/api/follow/start'] = () => ({
        refusal: null,
        notHeld: [],
        results: [{ channel: 'telegram', package: one[0], result: 'connect', url, limit: null }],
      });
      await render();
      await openDialog();

      await click(row('email')?.querySelector('[role="checkbox"]'));
      await click(button('Connect', row('telegram') ?? document.body));
      expect(row('telegram')?.textContent).toContain('You finish in Telegram after Follow');
      await click(button('Follow', dialog() ?? document.body));

      expect(bodyOf('/api/follow/start')).toMatchObject({ channels: ['telegram'] });
      expect(bodyOf('/api/follow/start')).not.toHaveProperty('email');
      const link = button('Open Telegram') as HTMLAnchorElement;
      expect(link.href).toBe(url);
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.target).toBe('_blank');
    });

    it('says what a full chat took and why the rest was not followed', async () => {
      const packages: FollowSlotProps['packages'] = ['a', 'b', 'c', 'd'].map((name) => ({ registry: 'npm', name }));
      routes['/api/follow/channels'] = () => ({ ...visitorChannels, dependents: null, notable: null });
      routes['/api/follow/start'] = () => ({
        refusal: null,
        notHeld: [],
        results: packages.map((pkg, at) => ({
          channel: 'telegram',
          package: pkg,
          result: at < 3 ? 'connect' : 'full',
          url: at < 3 ? 'https://t.me/somebot?start=f_c' : null,
          limit: at < 3 ? null : 3,
        })),
      });
      await render({ packages, label: 'nebula/ui packages', placement: 'used-by-empty' });
      await openDialog('Follow nebula/ui packages');

      expect(calls('/api/follow/channels')[0][0]).toBe('/api/follow/channels');
      expect(dialog()?.textContent).not.toContain('Today');
      await click(row('email')?.querySelector('[role="checkbox"]'));
      await click(button('Connect', row('telegram') ?? document.body));
      await click(button('Follow', dialog() ?? document.body));

      expect(bodyOf('/api/follow/start').packages).toEqual(packages);
      expect(dialog()?.textContent).toContain('Followed 3 of 4 on Telegram: a chat can follow 3 packages.');
    });

    it('lets a signed-in viewer follow at once on their chat, and unfollow where they follow', async () => {
      session.current = { data: { user: { githubLogin: 'octocat', email: 'octo@example.com' } } };
      routes['/api/follow/channels'] = () => ({
        ...visitorChannels,
        channels: [
          option('email', { limit: 50, linked: true, addressHint: 'o•••@example.com' }),
          option('telegram', { linked: true, rankUpdates: true }),
        ],
      });
      routes['/api/follow/state'] = () => ({
        follows: [{ id: 'f1', channel: 'email', package: one[0], status: 'active', events: ALL }],
      });
      routes['/api/follow/change'] = () => ({
        follow: { id: 'f1', channel: 'email', package: one[0], status: 'removed', events: ALL },
      });
      await render();
      await openDialog('Following');

      expect(row('email')?.textContent).toContain('Following · o•••@example.com');
      expect(row('telegram')?.textContent).toContain('Connected · you get rank updates here');
      expect(row('telegram')?.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('true');

      await click(button('Unfollow', row('email') ?? document.body));
      expect(bodyOf('/api/follow/change')).toEqual({ followId: 'f1', remove: true });
      expect(button('Follow', container)).toBeTruthy();
    });

    it('offers a signed-in viewer their own email as the address', async () => {
      session.current = { data: { user: { githubLogin: 'octocat', email: 'octo@example.com' } } };
      await render();
      await openDialog();

      expect(row('email')?.querySelector('input')?.value).toBe('octo@example.com');
    });

    it('says GitRanks has no data for a package it does not hold', async () => {
      routes['/api/follow/start'] = () => ({ refusal: 'not_held', notHeld: [one[0]], results: [] });
      await render();
      await openDialog();
      await type(row('email')?.querySelector('input') as HTMLInputElement, 'me@example.com');
      await click(button('Follow', dialog() ?? document.body));

      expect(dialog()?.textContent).toContain(
        "GitRanks has no data for react-resize-detector yet, so it can't be followed.",
      );
      expect(button('Back', dialog() ?? document.body)).toBeTruthy();
    });

    it('says following is unavailable when the channels cannot be read', async () => {
      routes['/api/follow/channels'] = () => {
        throw new Error('offline');
      };
      await render();
      await openDialog();

      expect(dialog()?.textContent).toContain("Following isn't available right now.");
      expect((button('Follow', dialog() ?? document.body) as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
