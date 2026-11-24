// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetHeroApplication, rememberHeroApplication } from '@/lib/unsung-hero/hero-application-cookie';

const { signOut, session } = vi.hoisted(() => ({
  signOut: vi.fn(),
  session: {
    error: undefined as string | undefined,
    login: 'octocat',
    status: 'authenticated' as 'loading' | 'authenticated' | 'unauthenticated',
  },
}));
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut,
  useSession: () => ({
    data:
      session.status === 'authenticated'
        ? {
            user: { githubLogin: session.login, name: 'Octo Cat', image: 'https://example.test/a.png?v=4' },
            error: session.error,
          }
        : session.status === 'loading'
          ? undefined
          : null,
    status: session.status,
  }),
}));
vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt} />,
}));

const { default: SigninButton, showsAdminLinks } = await import('./signin-button');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  signOut.mockReset();
  session.error = undefined;
  session.login = 'octocat';
  session.status = 'authenticated';
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  forgetHeroApplication();
});

/** Opens the avatar's menu the way a pointer does. */
const openMenu = async () => {
  const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLElement;
  await act(async () => {
    trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }));
  });
};

const items = () => [...document.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent);

describe('the avatar menu', () => {
  it('shows the admin links only to the admin login, in any case', () => {
    expect(showsAdminLinks('maslianok')).toBe(true);
    expect(showsAdminLinks('Maslianok')).toBe(true);
    expect(showsAdminLinks('octocat')).toBe(false);
    expect(showsAdminLinks(undefined)).toBe(false);
  });

  it('lists only Profile and Sign Out for everyone else', async () => {
    await act(async () => root.render(<SigninButton />));
    await openMenu();
    expect(items()).toEqual(['Profile', 'Sign Out']);
    expect(document.querySelector('a[href="/unsung-heroes/apply"]')).toBeNull();
    expect(document.querySelector('a[href="/admin/unsung-hero"]')).toBeNull();
  });

  it('adds Unsung hero admin for the admin', async () => {
    session.login = 'maslianok';
    await act(async () => root.render(<SigninButton />));
    await openMenu();
    expect(items()).toEqual(['Profile', 'Unsung hero admin', 'Sign Out']);
    expect(document.querySelector('a[href="/admin/unsung-hero"]')).not.toBeNull();
  });

  it('Sign Out forgets the browser’s note of an open application', async () => {
    rememberHeroApplication('octocat');
    await act(async () => root.render(<SigninButton />));
    await openMenu();
    const signOutItem = [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === 'Sign Out',
    ) as HTMLElement;
    await act(async () => signOutItem.click());
    expect(signOut).toHaveBeenCalled();
    expect(document.cookie).not.toContain('hero_application=octocat');
  });

  it('“Maybe later” on an expired token signs out and forgets the note too', async () => {
    session.error = 'RefreshTokenError';
    rememberHeroApplication('octocat');
    await act(async () => root.render(<SigninButton />));
    const later = [...document.querySelectorAll('button')].find((each) => each.textContent === 'Maybe later');
    await act(async () => later?.click());
    expect(signOut).toHaveBeenCalled();
    expect(document.cookie).not.toContain('hero_application=octocat');
  });

  it('is reached with Tab, opens with Enter or Space, closes with Escape and gives focus back', async () => {
    await act(async () => root.render(<SigninButton />));
    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLElement;
    // A button: in the Tab order, with a name a screen reader says.
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('aria-label')).toBe('Your account');
    expect(trigger.tabIndex).toBe(0);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    for (const key of ['Enter', ' ']) {
      await act(async () => {
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      });
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(items()).toEqual(['Profile', 'Sign Out']);

      await act(async () => {
        (document.activeElement ?? document.body).dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
      });
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(items()).toEqual([]);
      // The menu hands focus back on the next turn of the event loop.
      await act(async () => new Promise((done) => setTimeout(done, 0)));
      expect(document.activeElement).toBe(trigger);
    }
  });
});

describe('while the session is read', () => {
  const avatarPlace = () => container.querySelector('span[aria-hidden="true"]');
  const signInButton = () => container.querySelector('button[aria-label="Sign in"]');

  it('draws the avatar’s place for a browser holding a session, and Sign in for one without, from the first paint', async () => {
    session.status = 'loading';
    await act(async () => root.render(<SigninButton />));
    // Both are in the page; the hint set on the root before the first paint picks the one shown.
    expect(avatarPlace()?.className).toContain('hidden');
    expect(avatarPlace()?.className).toContain('[html[data-has-session]_&]:block');
    expect(avatarPlace()?.className).toContain('size-8');
    expect(signInButton()?.className).toContain('[html[data-has-session]_&]:hidden');
  });

  it('draws Sign in alone once the session says nobody is signed in', async () => {
    session.status = 'unauthenticated';
    await act(async () => root.render(<SigninButton />));
    expect(avatarPlace()).toBeNull();
    expect(signInButton()?.className).not.toContain('data-has-session');
  });
});
