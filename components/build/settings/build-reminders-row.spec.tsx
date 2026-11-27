// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { BuildRemindersRow } = await import('./build-reminders-row');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('"Build reminders" in Settings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const draw = (on: boolean, noAddress = false) =>
    act(async () =>
      root.render(
        <ul>
          <BuildRemindersRow on={on} noAddress={noAddress} />
        </ul>,
      ),
    );
  const toggle = () => container.querySelector<HTMLInputElement>('input[role="switch"]');
  const said = () => container.querySelector('label span')?.textContent;

  it('changes in place and saves at once through Build’s route', async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true, data: { reminders: false } }));
    vi.stubGlobal('fetch', fetch);
    await draw(true);
    expect(said()).toBe('On');
    await act(async () => toggle()?.click());
    expect(said()).toBe('Off');
    expect(fetch).toHaveBeenCalledWith(
      '/api/me/build/settings/save',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ reminders: false }) }),
    );
    expect(container.querySelector('li')?.getAttribute('data-build-reminders')).toBe('off');
  });

  it('moves back and says why when the save fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: false, error: 'FAILED' }, { status: 502 })),
    );
    await draw(true);
    await act(async () => toggle()?.click());
    expect(said()).toBe('On');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'We could not save just now. Try again in a minute.',
    );
  });

  it('cannot be turned on with no address, and says no email is sent', async () => {
    await draw(false, true);
    expect(toggle()?.disabled).toBe(true);
    expect(container.textContent).toContain('We have no email address for you, so no email is sent.');
  });
});
