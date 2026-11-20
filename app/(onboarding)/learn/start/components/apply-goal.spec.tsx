// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const learn = vi.hoisted(() => ({ saveLearnProfile: vi.fn() }));
vi.mock('@/lib/learn/actions', () => learn);

const { ApplyLearnGoal } = await import('./apply-goal');
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const GOAL = { language: 'Go', level: 2 } as const;

const arrive = async (props: Parameters<typeof ApplyLearnGoal>[0]) => {
  window.history.replaceState(null, '', '/learn/start/issues?language=Go&level=2');
  await act(async () => root.render(<ApplyLearnGoal {...props} />));
};

describe('the goal back from the sign-in, applied once', () => {
  it('is saved when the account has none, then the page is read again at the address without it', async () => {
    learn.saveLearnProfile.mockResolvedValue({ ok: true, data: {} });
    await arrive({ goal: GOAL, profile: emptyProfile, saved: false });
    expect(learn.saveLearnProfile).toHaveBeenCalledOnce();
    expect(learn.saveLearnProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        goalKind: 'LANGUAGE',
        goalValue: 'Go',
        levels: expect.arrayContaining([{ language: 'Go', level: 2 }]),
      }),
    );
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/learn/start/issues', { scroll: false });
  });

  it('a level the address lacks is the one the profile would show', async () => {
    learn.saveLearnProfile.mockResolvedValue({ ok: true, data: {} });
    await arrive({ goal: { language: 'JavaScript', level: null }, profile: emptyProfile, saved: false });
    expect(learn.saveLearnProfile.mock.calls[0][0].levels).toContainEqual({ language: 'JavaScript', level: 2 });
  });

  it('an entered account moves on to where the page says, after the save', async () => {
    learn.saveLearnProfile.mockResolvedValue({ ok: true, data: {} });
    await arrive({ goal: GOAL, profile: null, saved: false, moveTo: '/learn' as never });
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/learn', { scroll: false });
  });

  it('never overwrites a saved goal: nothing is written, and the goal leaves the address', async () => {
    await arrive({ goal: GOAL, profile: filledProfile, saved: true });
    expect(learn.saveLearnProfile).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(container.textContent).toBe('');
  });

  it('a failed save says so, keeps the goal in the address, and Try again saves it', async () => {
    learn.saveLearnProfile.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await arrive({ goal: GOAL, profile: emptyProfile, saved: false, moveTo: '/learn' as never });
    expect(container.textContent).toContain('Your goal could not be saved.');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/learn');
    expect(window.location.search).toBe('?language=Go&level=2');
    learn.saveLearnProfile.mockResolvedValueOnce({ ok: true, data: {} });
    await act(async () => container.querySelector('button')?.click());
    expect(learn.saveLearnProfile).toHaveBeenCalledTimes(2);
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/learn', { scroll: false });
  });
});
