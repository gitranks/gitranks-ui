// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contribute = vi.hoisted(() => ({ savePreferences: vi.fn() }));
vi.mock('@/lib/contribute/actions', () => contribute);

const { LANGUAGES_DIALOG, LanguagesDialog } = await import('./languages-dialog');

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

const buttonOf = (label: string) =>
  [...document.querySelectorAll('button')].find((each) => each.textContent?.trim() === label);
const isOpen = () => document.body.textContent?.includes(LANGUAGES_DIALOG.text) ?? false;

const onSaved = vi.fn();
const beforeSave = vi.fn(async () => undefined);

/** The dialog as a page draws it: its own "Change", opened and closed by the page. */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add a language
      </button>
      <LanguagesDialog
        open={open}
        onOpenChange={setOpen}
        start={['JS_TS', 'GO']}
        preferences={null}
        trigger={<button type="button">Change</button>}
        beforeSave={beforeSave}
        onSaved={onSaved}
      />
    </>
  );
}

const openIt = async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => buttonOf('Change')?.click());
  expect(isOpen()).toBe(true);
};

describe('the one languages dialog', () => {
  it('opens with its starting languages ticked: a save untouched keeps them', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: true, data: {} });
    await openIt();
    await act(async () => buttonOf('Save')?.click());
    expect(beforeSave).toHaveBeenCalledTimes(1);
    expect(beforeSave.mock.invocationCallOrder[0]).toBeLessThan(contribute.savePreferences.mock.invocationCallOrder[0]);
    expect(contribute.savePreferences).toHaveBeenCalledWith({ languages: ['JS_TS', 'GO'] });
    expect(onSaved).toHaveBeenCalledWith({ languages: ['JS_TS', 'GO'] });
    expect(isOpen()).toBe(false);
  });

  it('Cancel and Escape close it without saving', async () => {
    await openIt();
    await act(async () => buttonOf('Rust')?.click());
    await act(async () => buttonOf('Cancel')?.click());
    expect(isOpen()).toBe(false);

    await act(async () => buttonOf('Change')?.click());
    expect(isOpen()).toBe(true);
    await act(async () => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(isOpen()).toBe(false);
    expect(contribute.savePreferences).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('opened again, starts from its starting languages, not from a draft left behind', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: true, data: {} });
    await openIt();
    await act(async () => buttonOf('Rust')?.click());
    await act(async () => buttonOf('Cancel')?.click());
    await act(async () => buttonOf('Change')?.click());
    await act(async () => buttonOf('Save')?.click());
    expect(contribute.savePreferences).toHaveBeenCalledWith({ languages: ['JS_TS', 'GO'] });
  });

  it('opened by the page ("Add a language") after a Cancel, starts from its starting languages too', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: true, data: {} });
    await openIt();
    await act(async () => buttonOf('Rust')?.click());
    await act(async () => buttonOf('Cancel')?.click());
    await act(async () => buttonOf('Add a language')?.click());
    expect(isOpen()).toBe(true);
    await act(async () => buttonOf('Save')?.click());
    expect(contribute.savePreferences).toHaveBeenCalledWith({ languages: ['JS_TS', 'GO'] });
  });

  it('a failed save stays open with the error line, and nothing hears of a save', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: false, error: 'SIGNED_OUT' });
    await openIt();
    await act(async () => buttonOf('Save')?.click());
    expect(isOpen()).toBe(true);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Your session ended. Sign in again and retry.');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
