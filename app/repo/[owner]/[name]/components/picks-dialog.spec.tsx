// @vitest-environment jsdom
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PICK_DIALOGS, pickCopyOf } from '../utils/pick-messages';
import { PicksDialog } from './picks-dialog';
import type { PickRef } from '@/types/daily-updates.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROCKET: PickRef = { kind: 'repo', name: 'octo/rocket' };
const LANTERN: PickRef = { kind: 'repo', name: 'Octo/Lantern' };

/** Each row of the list, its parts joined by " | ". */
const rows = () =>
  [...document.querySelectorAll('[role="dialog"] li')].map((row) =>
    row.children.length ? [...row.children].map((part) => part.textContent).join(' | ') : row.textContent,
  );
const buttonNamed = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (button) => button.textContent?.trim() === name,
  );

describe('PicksDialog', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onRemove = vi.fn();
  const onPrimary = vi.fn();

  const render = (props: Partial<ComponentProps<typeof PicksDialog>> = {}) =>
    act(() =>
      root.render(
        <PicksDialog
          open
          onOpenChange={() => {}}
          copy={PICK_DIALOGS.yourDailyUpdates}
          onRemove={onRemove}
          onPrimary={onPrimary}
          {...props}
        />,
      ),
    );

  beforeEach(() => {
    onRemove.mockReset();
    onPrimary.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  it('lists the profile first, then each pick by its name with Remove, and how many are left', () => {
    render({ picks: [ROCKET, LANTERN], profileLogin: 'Mona-Dev', showLeft: true });

    expect(rows()).toEqual([
      'Mona-Dev | Your profile',
      'octo/rocket | Remove',
      'Octo/Lantern | Remove',
      'You can add 1 more repo.',
    ]);
    expect(buttonNamed('Remove')?.getAttribute('aria-label')).toBe('Remove octo/rocket');
  });

  it('says what each pick is once packages are shown, a package by its own name', () => {
    const NEBULA: PickRef = { kind: 'package', name: 'npm/@nebula/ui' };
    render({ picks: [ROCKET, NEBULA], profileLogin: 'Mona-Dev', showLeft: true, list: pickCopyOf(true).list });

    expect(rows()).toEqual([
      'Mona-Dev | Your profile',
      'octo/rocketRepository | Remove',
      '@nebula/uinpm package | Remove',
      'You can add 1 more repo or package.',
    ]);
    expect(buttonNamed('Remove')?.getAttribute('aria-label')).toBe('Remove octo/rocket');
  });

  it('hands the pick to Remove', () => {
    render({ picks: [ROCKET, LANTERN] });

    const removes = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] li button')];
    act(() => removes[1].click());

    expect(onRemove).toHaveBeenCalledExactlyOnceWith(LANTERN);
  });

  it('turns every Remove and the main button off while a removal runs', () => {
    render({ picks: [ROCKET, LANTERN], removing: ROCKET });

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] li button')];
    expect(buttons.map((button) => button.disabled)).toEqual([true, true]);
    expect(buttonNamed(PICK_DIALOGS.yourDailyUpdates.primary)?.disabled).toBe(true);
  });

  it('draws no list without picks', () => {
    render({ copy: PICK_DIALOGS.dailyLimit, onRemove: undefined });

    expect(document.querySelector('[role="dialog"] ul')).toBeNull();
    act(() => buttonNamed(PICK_DIALOGS.dailyLimit.primary)?.click());
    expect(onPrimary).toHaveBeenCalledOnce();
  });
});
