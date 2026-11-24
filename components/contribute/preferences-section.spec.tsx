// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
const contribute = vi.hoisted(() => ({ savePreferences: vi.fn() }));
vi.mock('@/lib/contribute/actions', () => contribute);

const { PreferencesSection } = await import('./preferences-section');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  window.history.replaceState(null, '', '/my/settings/work');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const buttonOf = (label: string) =>
  [...document.querySelectorAll('button')].find((each) => each.textContent?.trim() === label);

describe('the Languages dialog on Settings', () => {
  it('offers the languages alone, and Save sends them alone: a kind or size saved earlier is kept', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: true, data: {} });
    const preferences = { languages: ['GO' as const], topicIds: [], kinds: ['BUG' as const], maxSize: 'M' as const };
    await act(async () => root.render(<PreferencesSection preferences={preferences} modes />));

    expect(container.textContent).toContain('Languages');
    expect(container.textContent).toContain('Go');
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Edit languages"]')?.click());
    expect(document.body.textContent).not.toContain('Issue kinds');
    expect(document.body.textContent).not.toContain('Largest issue size');

    await act(async () => buttonOf('Rust')?.click());
    await act(async () => buttonOf('Save')?.click());
    expect(contribute.savePreferences).toHaveBeenCalledWith({ languages: ['GO', 'RUST'] });
  });
});
