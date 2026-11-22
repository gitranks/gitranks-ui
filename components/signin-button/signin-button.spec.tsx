// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetHeroApplication, rememberHeroApplication } from '@/lib/unsung-hero/hero-application-cookie';

const { signOut, session } = vi.hoisted(() => ({
  signOut: vi.fn(),
  session: { error: undefined as string | undefined },
}));
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut,
  useSession: () => ({
    data: {
      user: { githubLogin: 'octocat', name: 'Octo Cat', image: 'https://example.test/a.png?v=4' },
      error: session.error,
    },
    status: 'authenticated',
  }),
}));
vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt} />,
}));

const { default: SigninButton, heroMenuItemText } = await import('./signin-button');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  signOut.mockReset();
  session.error = undefined;
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
  it('words the Unsung hero item by whether an application is open', () => {
    expect(heroMenuItemText(false)).toBe('Apply for Unsung hero');
    expect(heroMenuItemText(true)).toBe('Your Unsung hero application');
  });

  it('lists Apply for Unsung hero between Profile and Sign Out', async () => {
    await act(async () => root.render(<SigninButton />));
    await openMenu();
    expect(items()).toEqual(['Profile', 'Apply for Unsung hero', 'Sign Out']);
    expect(document.querySelector('a[href="/unsung-heroes/apply"]')).not.toBeNull();
  });

  it('says "Your Unsung hero application" for the login the browser notes, and Sign Out forgets it', async () => {
    rememberHeroApplication('octocat');
    await act(async () => root.render(<SigninButton />));
    await openMenu();
    expect(items()).toContain('Your Unsung hero application');
    const signOutItem = [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === 'Sign Out',
    ) as HTMLElement;
    await act(async () => signOutItem.click());
    expect(signOut).toHaveBeenCalled();
    expect(document.cookie).not.toContain('hero_application=octocat');
  });

  it('another login’s note does not count', async () => {
    rememberHeroApplication('hubot');
    await act(async () => root.render(<SigninButton />));
    await openMenu();
    expect(items()).toContain('Apply for Unsung hero');
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
});
