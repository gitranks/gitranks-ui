// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const { COPY_FAILED, CopyButton } = await import('./copy-button');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  toast.error.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const press = async (onCopy = vi.fn()) => {
  await act(async () => root.render(<CopyButton text="hello" label="Copy" onCopy={onCopy} />));
  await act(async () => host.querySelector('button')?.click());
  return onCopy;
};

describe('CopyButton', () => {
  it('copies, says "Copied", and tells whoever listens', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const onCopy = await press();
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(onCopy).toHaveBeenCalledOnce();
    expect(host.querySelector('button')?.textContent).toBe('Copied');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('says in a toast when the browser refuses to copy, or has no clipboard', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('no'))) } });
    const onCopy = await press();
    expect(toast.error).toHaveBeenCalledWith(COPY_FAILED);
    expect(onCopy).not.toHaveBeenCalled();
    expect(host.querySelector('button')?.textContent).toBe('Copy');
    vi.stubGlobal('navigator', {});
    await press();
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(COPY_FAILED).toBe('Copy did not work. Select the text and copy it.');
  });
});
