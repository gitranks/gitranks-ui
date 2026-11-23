// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));

const { LearnPreferencesGroup } = await import('./learn-preferences-group');
const { LEARN_SETUP_SETTLED_EVENT } = await import('@/lib/learn/learn-bar');
const { setupGuessed, setupNone, setupWorking } = await import('@/lib/learn/__fixtures__/setup');

import type { LearnSetupRead } from '@/lib/learn/setup';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('"Languages and level" while our guess runs', () => {
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
    refresh.mockReset();
  });

  const settle = () => act(() => window.dispatchEvent(new Event(LEARN_SETUP_SETTLED_EVENT)));

  it.each([
    ['reading the profile', setupWorking],
    ['none yet', null],
    ['none yet, as the API says it', setupNone],
  ])('reads the page again when the bar finds the guess in: %s', (_state, setup) => {
    act(() => root.render(<LearnPreferencesGroup setup={setup as LearnSetupRead | null} />));
    expect(refresh).not.toHaveBeenCalled();
    settle();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('leaves a guess that is in, or a read that failed, as it is', () => {
    for (const setup of [setupGuessed, undefined]) {
      act(() => root.render(<LearnPreferencesGroup setup={setup} />));
      settle();
    }
    expect(refresh).not.toHaveBeenCalled();
  });
});
