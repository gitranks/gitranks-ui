// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const learn = vi.hoisted(() => ({ saveLearnProfile: vi.fn() }));
vi.mock('@/lib/learn/actions', () => learn);

const { LearnGoalQuick } = await import('./learn-goal-quick');
const { emptyProfile } = await import('@/lib/learn/__fixtures__/profile');

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

const submit = async () => {
  const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
  await act(async () => button?.click());
};

describe("Your goal's button, in Learn's flow", () => {
  it('a visitor’s draft goes on to Pick an issue with the goal in the address, and saves nothing', async () => {
    await act(async () =>
      root.render(<LearnGoalQuick profile={null} flow={{ initial: { language: 'Go', level: 2 }, draft: true }} />),
    );
    expect(container.textContent).toContain('Show issues for Go');
    expect(container.textContent).not.toContain('More choices');
    await submit();
    expect(learn.saveLearnProfile).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/learn/start/issues?language=Go&level=2');
  });

  it('a signed-in person’s goal is saved, then they go on to Pick an issue, the address without it', async () => {
    learn.saveLearnProfile.mockResolvedValue({ ok: true, data: {} });
    await act(async () =>
      root.render(
        <LearnGoalQuick
          profile={emptyProfile}
          flow={{ initial: { language: 'TypeScript', level: null }, draft: false }}
        />,
      ),
    );
    expect(container.textContent).toContain('More choices');
    await submit();
    expect(learn.saveLearnProfile).toHaveBeenCalledWith(
      expect.objectContaining({ goalKind: 'LANGUAGE', goalValue: 'TypeScript' }),
    );
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/learn/start/issues');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('a failed save keeps them on the step with the error line', async () => {
    learn.saveLearnProfile.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    await act(async () =>
      root.render(<LearnGoalQuick profile={null} flow={{ initial: { language: 'Rust', level: 0 }, draft: false }} />),
    );
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Your goal could not be saved. Reload the page and try again.',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('on the Learn tab it saves and reads the page again in place', async () => {
    learn.saveLearnProfile.mockResolvedValue({ ok: true, data: {} });
    await act(async () => root.render(<LearnGoalQuick profile={emptyProfile} />));
    expect(container.textContent).toContain('Show my issues');
    expect(container.querySelector('h2')?.textContent).toBe('What do you want to learn?');
  });
});
