// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FetchUserButtonForProfilePage } from './fetch-user-button';
import { DailyUpdateReason } from '@/types/generated/graphql';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, push } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  push: vi.fn<(href: string) => void>(),
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current, signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ login: 'octo-dev' }), useRouter: () => ({ push }) }));
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));

const SIGNED_OUT = { data: null, status: 'unauthenticated' };
const SIGNED_IN = { data: { user: { githubLogin: 'Mona-Dev', authMode: 'identity' } }, status: 'authenticated' };

const buttonNamed = (name: string) =>
  [...document.querySelectorAll('button, a')].find((element) => element.textContent?.trim() === name) as
    | HTMLElement
    | undefined;

const dialogTitle = () => document.querySelector('[role="dialog"] h2')?.textContent ?? null;

describe('the "Updates daily" dialogs', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = (reason: DailyUpdateReason) => {
    act(() =>
      root.render(
        <FetchUserButtonForProfilePage
          profileLogin="octo-dev"
          dailyUpdates={{ reasons: [reason], nextUpdateAt: '2026-11-15T17:00:00Z' }}
        />,
      ),
    );
  };

  const press = (name: string) => {
    const element = buttonNamed(name);
    expect(element, name).toBeDefined();
    act(() => element?.click());
  };

  beforeEach(() => {
    push.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  it('does nothing while the session loads', () => {
    session.current = { data: null, status: 'loading' };
    mount(DailyUpdateReason.Owner);
    press('Updates daily');

    expect(dialogTitle()).toBeNull();
  });

  it('"Get daily updates" opens a signed-in visitor\'s own profile', () => {
    session.current = SIGNED_IN;
    mount(DailyUpdateReason.Owner);
    press('Updates daily');
    expect(dialogTitle()).toBe('This profile updates every day');
    expect(document.body.textContent).toContain('@octo-dev signed in and starred our repo.');

    press('Get daily updates');
    expect(push).toHaveBeenCalledExactlyOnceWith('/profile/Mona-Dev');
    expect(dialogTitle()).toBeNull();
  });

  it('"Get daily updates" offers the sign-in to a signed-out visitor', () => {
    session.current = SIGNED_OUT;
    mount(DailyUpdateReason.Owner);
    press('Updates daily');
    press('Get daily updates');

    expect(push).not.toHaveBeenCalled();
    expect(dialogTitle()).toBe('Hi, I’m Vitalii 👋');
  });

  it('"Make a badge" opens the builder on the visitor\'s own login, or on developer badges signed out', () => {
    session.current = SIGNED_IN;
    mount(DailyUpdateReason.Badge);
    press('Updates daily');
    expect(document.body.textContent).toContain('@octo-dev has a GitRanks badge on GitHub.');
    press('Make a badge');
    expect(push).toHaveBeenLastCalledWith('/badge/builder?user=Mona-Dev');
    expect(dialogTitle()).toBeNull();

    session.current = SIGNED_OUT;
    mount(DailyUpdateReason.Badge);
    press('Updates daily');
    press('Make a badge');
    expect(push).toHaveBeenLastCalledWith('/badge/builder?user=');
  });

  it('"Close" closes the dialog and goes nowhere', () => {
    session.current = SIGNED_IN;
    mount(DailyUpdateReason.Badge);
    press('Updates daily');
    press('Close');

    expect(dialogTitle()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
