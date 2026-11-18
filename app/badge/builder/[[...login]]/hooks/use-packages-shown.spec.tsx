// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePackagesShown } from './use-packages-shown';
import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));

const fetchMock = vi.fn(async () => Response.json({ open: true }));

function Probe({ ask }: Readonly<{ ask: boolean }>) {
  return <span>{String(usePackagesShown(ask))}</span>;
}

describe('usePackagesShown', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    openInBrowserOf('/api/me/packages/open').reset();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('asks nothing unless told to, and is false until an answer is in', async () => {
    await act(async () => root.render(<Probe ask={false} />));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe('false');
  });

  it('asks once when told to, and gives the answer', async () => {
    await act(async () => root.render(<Probe ask />));
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(container.textContent).toBe('true');
  });

  it('reads an answer the page already has without asking again', async () => {
    await openInBrowserOf('/api/me/packages/open').ask(':signed-out');
    fetchMock.mockClear();
    await act(async () => root.render(<Probe ask={false} />));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe('true');
  });
});
