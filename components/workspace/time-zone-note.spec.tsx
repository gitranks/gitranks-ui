// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setContributeEmailSettings } = vi.hoisted(() => ({ setContributeEmailSettings: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmailSettings }));

const { TimeZoneNote } = await import('./time-zone-note');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SENT = 'gitranks:time-zone-sent';

describe('the time zone note', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    setContributeEmailSettings.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  const zone = (name: string | undefined) =>
    vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: name } as Intl.ResolvedDateTimeFormatOptions);
  /** One page view: the note mounts, and its call settles. */
  const visit = async () => {
    root = createRoot(container);
    await act(async () => root.render(<TimeZoneNote />));
    act(() => root.unmount());
  };

  it('sends the zone alone once per zone, and again after a move', async () => {
    zone('Europe/Warsaw');
    setContributeEmailSettings.mockResolvedValue({ ok: true, data: {} });

    await visit();
    await visit();
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ timeZone: 'Europe/Warsaw' });
    expect(window.localStorage.getItem(SENT)).toBe('Europe/Warsaw');
    expect(container.innerHTML).toBe('');

    vi.restoreAllMocks();
    zone('Asia/Tokyo');
    await visit();
    expect(setContributeEmailSettings).toHaveBeenLastCalledWith({ timeZone: 'Asia/Tokyo' });
    expect(window.localStorage.getItem(SENT)).toBe('Asia/Tokyo');
  });

  it('sends nothing when the browser tells no usable zone', async () => {
    zone(undefined);
    await visit();
    vi.restoreAllMocks();
    zone('Etc/Unknown');
    await visit();
    expect(setContributeEmailSettings).not.toHaveBeenCalled();
  });

  it('does not send a zone the API refused again, and tries again after a failure', async () => {
    zone('Mars/Olympus');
    setContributeEmailSettings.mockResolvedValueOnce({ ok: false, error: 'INVALID', message: 'Unknown time zone' });
    await visit();
    await visit();
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
    zone('Europe/Kyiv');
    setContributeEmailSettings.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    setContributeEmailSettings.mockRejectedValueOnce(new Error('network'));
    setContributeEmailSettings.mockResolvedValueOnce({ ok: true, data: {} });
    await visit();
    await visit();
    await visit();
    await visit();
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(4);
    expect(window.localStorage.getItem(SENT)).toBe('Europe/Kyiv');
  });
});
