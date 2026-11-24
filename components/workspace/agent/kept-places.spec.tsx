// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  saveContributeSettings: vi.fn(),
  noteProviderInterest: vi.fn(),
  withdrawProviderInterest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/workspace/actions', () => actions);
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

const { HostedAgentControl } = await import('./hosted-agent-control');
const { ComingSoon } = await import('./coming-soon');
const { agentTabViews, contributor, NOW, settings } = await import('@/lib/contribute/__fixtures__/contribute-views');

import type { ContributeView } from '@/lib/workspace/contribute.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  for (const action of Object.values(actions)) action.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const view: ContributeView = {
  ...agentTabViews.both,
  contributor: contributor({ settings: { ...settings, hostedLevel: 'MANUAL' } }),
};

/** The level picker's status line: kept under the levels whether it says anything or not. */
const statusLine = () => container.querySelector<HTMLElement>('[data-level-status]');

describe("the level picker's saving and error line", () => {
  it('stays under the levels, announced, and says saving and then why a save was refused', async () => {
    let answer: (value: unknown) => void = () => {};
    actions.saveContributeSettings.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    act(() => root.render(<HostedAgentControl view={view} counts={{ prBound: 0, queued: 0 }} now={NOW} />));

    const line = statusLine();
    expect(line?.getAttribute('aria-live')).toBe('polite');
    expect(line?.dataset.levelStatus).toBe('idle');
    expect(line?.textContent).toBe('');
    // After the levels, never inside a card.
    expect(line?.closest('[data-level-card]')).toBeNull();
    const cards = container.querySelectorAll('[data-level-card]');
    expect(cards[cards.length - 1].compareDocumentPosition(line!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    act(() => container.querySelector<HTMLButtonElement>('[role="radio"][value="NEXT"]')?.click());
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(actions.saveContributeSettings).toHaveBeenCalledWith({ hostedLevel: 'NEXT' });
    expect(statusLine()).toBe(line);
    expect(line?.dataset.levelStatus).toBe('saving');
    expect(line?.textContent).toBe('Saving…');

    await act(async () => answer({ ok: false, error: 'FAILED' }));
    expect(statusLine()).toBe(line);
    expect(line?.dataset.levelStatus).toBe('error');
    expect(line?.textContent).not.toBe('');
    expect(line?.className).toContain('text-destructive');
  });
});

describe('the compact "Notify me"', () => {
  it('opens the waiting list over the page, named, with its status line, and says what list once on it', async () => {
    actions.noteProviderInterest.mockResolvedValue({ ok: true, data: true });
    act(() => root.render(<ComingSoon viewer="signed-in" variant="compact" noted={[]} title="Coming soon:" />));

    const block = container.querySelector('[data-overview="coming-soon"]');
    const trigger = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Notify me →');
    expect(trigger).toBeDefined();
    // Closed: nothing of the list in the block.
    expect(document.querySelector('[data-coming-soon-list]')).toBeNull();

    act(() => {
      trigger?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      trigger?.click();
    });
    const list = document.querySelector<HTMLElement>('[data-coming-soon-list]');
    expect(list).not.toBeNull();
    // Over the page: the list is not inside the block, so nothing under the line moves.
    expect(block?.contains(list)).toBe(false);
    const name = list?.getAttribute('aria-labelledby');
    expect(name && document.getElementById(name)?.textContent).toBe('The waiting list');
    expect(list?.className).toContain('overflow-y-auto');
    expect(list?.className).toContain('max-h-');
    expect(list?.querySelector('[role="status"]')?.textContent).toBe('');

    const toggle = list?.querySelector<HTMLButtonElement>('[aria-label="Notify me when Gemini opens"]');
    await act(async () => toggle?.click());
    expect(list?.querySelector('[role="status"]')?.textContent).toContain("You're on the list for Gemini.");
    expect(trigger?.textContent).toBe('On the waiting list →');
  });
});
