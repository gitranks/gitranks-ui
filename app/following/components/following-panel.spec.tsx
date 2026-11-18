// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { followOf, subscriberOf } from '@/lib/link-token/__fixtures__/follow-links';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('../actions', () => ({
  changeFollowing: vi.fn(),
  resumeAddress: vi.fn(),
  setFollowEvents: vi.fn(),
  stopAllEmail: vi.fn(),
}));

const { FollowingPanel } = await import('./following-panel');

describe('the signed-in settings page’s presses', () => {
  let container: HTMLDivElement;
  let root: Root;

  const unfollow = async () => {
    const button = [...container.querySelectorAll('button')].find((el) => el.textContent === 'Unfollow');
    await act(async () => {
      button?.click();
    });
  };

  beforeEach(async () => {
    signIn.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <FollowingPanel session initial={{ kind: 'list', subscribers: [subscriberOf({ follows: [followOf()] })] }} />,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('asks for a new sign-in when the session ended, keeping the list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'sign_in' }, { status: 401 })),
    );
    await unfollow();

    expect(container.textContent).toContain('You are signed out. Sign in again to change what you follow.');
    expect(container.textContent).toContain('react-resize-detector');
    const signInButton = [...container.querySelectorAll('button')].find(
      (el) => el.textContent === 'Sign in with GitHub',
    );
    await act(async () => {
      signInButton?.click();
    });
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/following' });
  });

  it('says it did not go through when the feature is closed to the viewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'not_found' }, { status: 404 })),
    );
    await unfollow();

    expect(container.textContent).toContain('That did not go through. Try again in a few minutes.');
    expect(container.textContent).toContain('react-resize-detector');
  });
});
