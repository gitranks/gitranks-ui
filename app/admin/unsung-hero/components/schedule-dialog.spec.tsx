// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boardOf, CHECKED, liveCheckOf } from '../__fixtures__/board';
import { weekOptionsOf } from '../admin-weeks';
import { ScheduleDialog } from './schedule-dialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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
});

// Thursday: next week (W45) is inside the heads-up's 97 hours; W46 is the first week open with it.
const BOARD = boardOf({
  live: [],
  upcoming: [],
  nextWeek: {
    week: '2026-W45',
    startsAt: '2026-11-02T00:00:00.000Z',
    endsAt: '2026-11-09T00:00:00.000Z',
    closesAt: '2026-10-28T23:00:00.000Z',
  },
  firstOpenWeek: {
    week: '2026-W46',
    startsAt: '2026-11-09T00:00:00.000Z',
    endsAt: '2026-11-16T00:00:00.000Z',
    closesAt: '2026-11-04T23:00:00.000Z',
  },
});

/** A maintainer with no public email: the heads-up has nowhere to go. */
const NO_EMAIL = {
  ...CHECKED,
  liveCheck: liveCheckOf({ hasEmail: false, refusals: ['NO_EMAIL'], refusalsWithoutHeadsUp: [] }),
};

const open = () =>
  act(async () =>
    root.render(
      <ScheduleDialog
        candidate={NO_EMAIL}
        lastCheck={null}
        notice={null}
        weeks={weekOptionsOf(BOARD)}
        weeksWithoutHeadsUp={weekOptionsOf(BOARD, { headsUp: false })}
        onClose={() => undefined}
      />,
    ),
  );

const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]') as HTMLElement;
const headsUpField = () => dialog().querySelector<HTMLInputElement>('input[name="headsUp"]')?.value;
const weekValues = () =>
  [...dialog().querySelectorAll<HTMLOptionElement>('select[name="week"] option')]
    .map((option) => option.value)
    .filter(Boolean);
const toggle = () => act(async () => dialog().querySelector<HTMLButtonElement>('button#hero-heads-up')?.click());

describe('the Schedule dialog’s heads-up choice', () => {
  it('sends the heads-up by default: its weeks, its reason, its preview, and no public email stops it', async () => {
    await open();
    expect(dialog().querySelector('button#hero-heads-up')?.getAttribute('aria-checked')).toBe('true');
    expect(headsUpField()).toBe('true');
    expect(dialog().querySelector('#hero-reason')).not.toBeNull();
    expect(dialog().textContent).toContain('is our Unsung hero next week');
    expect(dialog().textContent).toContain('so the heads-up has nowhere to go');
    expect(weekValues()).not.toContain('2026-W45');
    expect(weekValues()).toContain('2026-W46');
    expect(dialog().querySelector('button#hero-week')?.textContent).toContain('2026-W46');
    expect(dialog().textContent).not.toContain('no chance to opt out');
  });

  it('turned off: next week is offered, the reason and preview go, the email is not needed, and it says so', async () => {
    await open();
    await toggle();
    expect(dialog().querySelector('button#hero-heads-up')?.getAttribute('aria-checked')).toBe('false');
    expect(headsUpField()).toBe('false');
    expect(dialog().querySelector('#hero-reason')).toBeNull();
    expect(dialog().textContent).not.toContain('is our Unsung hero next week');
    expect(dialog().textContent).not.toContain('so the heads-up has nowhere to go');
    expect(dialog().textContent).toContain(
      'No heads-up: the maintainer gets no email before the week and no chance to opt out.',
    );
    // The native select's options follow the items in the order they mounted: compare them as a set.
    expect(weekValues()).toContain('2026-W45');
    expect(weekValues()).toHaveLength(9);
    // The pick stays on the week chosen while it is still offered.
    expect(dialog().querySelector('button#hero-week')?.textContent).toContain('2026-W46');

    // Back on: the week inside the 97 hours is offered no more.
    await toggle();
    expect(headsUpField()).toBe('true');
    expect(weekValues()).not.toContain('2026-W45');
  });

  it('the week picker is the app’s select: a trigger with its chevron, not a bare native select', async () => {
    await open();
    const trigger = dialog().querySelector<HTMLButtonElement>('button#hero-week');
    expect(trigger?.getAttribute('data-slot')).toBe('select-trigger');
    expect(trigger?.querySelector('svg.lucide-chevron-down')).not.toBeNull();
    expect(trigger?.textContent).toContain('Nov 9 – 15 (2026-W46)');
    expect(dialog().querySelector('select[name="week"]')?.getAttribute('aria-hidden')).toBe('true');
  });
});
