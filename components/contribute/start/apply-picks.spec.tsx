// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contribute = vi.hoisted(() => ({ savePreferences: vi.fn() }));
vi.mock('@/lib/contribute/actions', () => contribute);

const { ApplyWorkPicks } = await import('./apply-picks');

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

const arrive = async (search: string, saved: boolean) => {
  window.history.replaceState(null, '', `/contribute/start/agent${search}`);
  await act(async () => root.render(<ApplyWorkPicks saved={saved} />));
};

describe('the picks back from the sign-in, applied once', () => {
  it('are saved when the account has none, then leave the address', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: true, data: {} });
    await arrive('?languages=rust,go&kinds=bug', false);
    expect(contribute.savePreferences).toHaveBeenCalledOnce();
    expect(contribute.savePreferences).toHaveBeenCalledWith({ languages: ['GO', 'RUST'], kinds: ['BUG'] });
    expect(window.location.search).toBe('');
    expect(container.textContent).toBe('');
  });

  it('never overwrite saved preferences: nothing is written and the picks leave the address', async () => {
    await arrive('?languages=rust', true);
    expect(contribute.savePreferences).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('write nothing without picks', async () => {
    await arrive('', false);
    expect(contribute.savePreferences).not.toHaveBeenCalled();
  });

  it('a failed save says so quietly, keeps the picks in the address, and Try again uses them', async () => {
    contribute.savePreferences.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await arrive('?kinds=docs', false);
    expect(container.textContent).toContain('Your picks from step 1 could not be saved.');
    expect(window.location.search).toBe('?kinds=docs');
    contribute.savePreferences.mockResolvedValueOnce({ ok: true, data: {} });
    await act(async () => container.querySelector('button')?.click());
    expect(contribute.savePreferences).toHaveBeenLastCalledWith({ languages: [], kinds: ['DOCS'] });
    expect(window.location.search).toBe('');
    expect(container.textContent).toBe('');
  });
});
