// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { saveLearnEmailSettingsAction, setContributeEmailSettings, refresh } = vi.hoisted(() => ({
  saveLearnEmailSettingsAction: vi.fn(),
  setContributeEmailSettings: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/learn/settings.actions', () => ({ saveLearnEmailSettingsAction }));
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmailSettings }));

const { LearnEmailFailedRow, LessonsToRepeatRow, TimeZoneRow } = await import('./learn-email-rows');
const { learnEmail } = await import('@/lib/learn/__fixtures__/settings');
const { email } = await import('@/lib/contribute/__fixtures__/contribute-views');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A save held open until the spec answers it. */
const held = () => {
  let answer: (value: unknown) => void = () => {};
  saveLearnEmailSettingsAction.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
  return (value: unknown) => answer(value);
};

describe("Learn's rows as the server draws them", () => {
  it('draws the switch off with its line, and On and Off in the same width', () => {
    const html = renderToStaticMarkup(
      <ul>
        <LessonsToRepeatRow on={false} />
      </ul>,
    );
    expect(html).toContain('data-email-lessons="off"');
    expect(html).toContain('One email a day at most, in the morning, and only when a lesson is still due.');
    expect(html).toMatch(/<span class="inline-block w-6">Off<\/span>/);
    expect(html).toMatch(/role="switch"[^>]*aria-describedby="[^"]+-line"/);
  });

  it('disables the switch with no address', () => {
    const html = renderToStaticMarkup(
      <ul>
        <LessonsToRepeatRow on noAddress />
      </ul>,
    );
    expect(html).toMatch(/role="switch"[^>]*disabled=""/);
  });

  it('draws the zone with its city and offset on a button that names it', () => {
    const html = renderToStaticMarkup(
      <ul>
        <TimeZoneRow settings={learnEmail.chosen} savedZone="Europe/Berlin" />
      </ul>,
    );
    expect(html).toContain('data-time-zone-by="person"');
    expect(html).toContain('aria-label="Time zone: Berlin (UTC+1)"');
    expect(html).toContain('You chose it, so it no longer follows your device.');
  });

  it("says when Learn's rows did not load", () => {
    expect(renderToStaticMarkup(<LearnEmailFailedRow />)).toContain(
      'Lessons to repeat and your time zone didn&#x27;t load.',
    );
  });
});

describe("Learn's rows in the browser", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Europe/Lisbon',
    } as Intl.ResolvedDateTimeFormatOptions);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    saveLearnEmailSettingsAction.mockReset();
    setContributeEmailSettings.mockReset();
    refresh.mockReset();
    window.localStorage.clear();
  });

  const toggle = () => container.querySelector<HTMLInputElement>('[role="switch"]')!;
  const alert = () => container.querySelector('[role="alert"]');
  const row = () => container.querySelector<HTMLElement>('[data-email-row]')!;
  const openList = async () => {
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[role="combobox"]')!
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })),
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
  };
  const choose = async (zone: string) => {
    const item = document.querySelector<HTMLElement>(`[data-zone="${zone}"]`);
    expect(item).not.toBeNull();
    await act(async () => item!.click());
  };

  it('turns the switch on at once, sends the switch alone, and reads the page again', async () => {
    const answer = held();
    act(() =>
      root.render(
        <ul>
          <LessonsToRepeatRow on={false} />
        </ul>,
      ),
    );
    await act(async () => toggle().click());
    expect(toggle().checked).toBe(true);
    expect(saveLearnEmailSettingsAction).toHaveBeenCalledWith({ lessonsToRepeat: true });
    // A second change while the first saves is ignored.
    await act(async () => toggle().click());
    expect(saveLearnEmailSettingsAction).toHaveBeenCalledTimes(1);
    await act(async () => answer({ ok: true, data: learnEmail.on }));
    expect(row().dataset.emailLessons).toBe('on');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(alert()).toBeNull();
  });

  it('moves back and says why when the save fails, or Learn is no longer open', async () => {
    saveLearnEmailSettingsAction.mockResolvedValueOnce({ ok: false, error: 'SIGNED_OUT' });
    act(() =>
      root.render(
        <ul>
          <LessonsToRepeatRow on={false} />
        </ul>,
      ),
    );
    await act(async () => toggle().click());
    expect(toggle().checked).toBe(false);
    expect(alert()?.textContent).toBe('Your session ended. Sign in again, then change it.');
    saveLearnEmailSettingsAction.mockResolvedValueOnce({ ok: true, data: null });
    await act(async () => toggle().click());
    expect(toggle().checked).toBe(false);
    expect(alert()?.textContent).toBe('Learn is not open to your account now, so nothing was saved.');
    saveLearnEmailSettingsAction.mockRejectedValueOnce(new Error('down'));
    await act(async () => toggle().click());
    expect(alert()?.textContent).toBe('We could not save just now. Try again in a minute.');
    expect(refresh).not.toHaveBeenCalled();
  });

  it("makes another city the person's own, with the switch left as it is", async () => {
    saveLearnEmailSettingsAction.mockResolvedValueOnce({ ok: true, data: learnEmail.chosen });
    act(() =>
      root.render(
        <ul>
          <TimeZoneRow settings={learnEmail.device} savedZone={email.on.timeZone} />
        </ul>,
      ),
    );
    await openList();
    const first = document.querySelector<HTMLElement>('[data-zone]');
    expect(first?.dataset.zone).toBe('Europe/Lisbon');
    expect(first?.textContent).toContain('· from your device');
    await choose('Europe/Berlin');
    expect(saveLearnEmailSettingsAction).toHaveBeenCalledWith({ timeZone: 'Europe/Berlin', timeZoneBy: 'PERSON' });
    expect(setContributeEmailSettings).not.toHaveBeenCalled();
    expect(row().textContent).toContain('Berlin time. You chose it, so it no longer follows your device.');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("hands the zone back to the device and sends the device's zone, since the one kept was chosen", async () => {
    saveLearnEmailSettingsAction.mockResolvedValueOnce({
      ok: true,
      data: { ...learnEmail.chosen, timeZoneBy: 'DEVICE' },
    });
    setContributeEmailSettings.mockResolvedValueOnce({ ok: true, data: { ...email.on, timeZone: 'Europe/Lisbon' } });
    act(() =>
      root.render(
        <ul>
          <TimeZoneRow settings={learnEmail.chosen} savedZone="Europe/Berlin" />
        </ul>,
      ),
    );
    await openList();
    await choose('Europe/Lisbon');
    expect(saveLearnEmailSettingsAction).toHaveBeenCalledWith({ timeZoneBy: 'DEVICE' });
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ timeZone: 'Europe/Lisbon' });
    expect(row().textContent).toContain('Lisbon time. Taken from your device.');
    expect(window.localStorage.getItem('gitranks:time-zone-sent')).toBe('Europe/Lisbon');
  });

  it("sends the device's zone when the setting follows the device but another zone is kept", async () => {
    // No zone known yet: the row says New York's, though it follows the device.
    saveLearnEmailSettingsAction.mockResolvedValueOnce({ ok: true, data: learnEmail.unknown });
    setContributeEmailSettings.mockResolvedValueOnce({ ok: true, data: { ...email.on, timeZone: 'Europe/Lisbon' } });
    act(() =>
      root.render(
        <ul>
          <TimeZoneRow settings={learnEmail.unknown} savedZone={null} />
        </ul>,
      ),
    );
    expect(row().textContent).toContain('We could not tell your time zone');
    await openList();
    await choose('Europe/Lisbon');
    expect(saveLearnEmailSettingsAction).toHaveBeenCalledWith({ timeZoneBy: 'DEVICE' });
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ timeZone: 'Europe/Lisbon' });
    expect(row().textContent).toContain('Lisbon time. Taken from your device.');
    // Kept now: the same pick again saves nothing.
    saveLearnEmailSettingsAction.mockClear();
    await openList();
    await choose('Europe/Lisbon');
    expect(saveLearnEmailSettingsAction).not.toHaveBeenCalled();
  });

  it.each([
    ['answers no', () => setContributeEmailSettings.mockResolvedValueOnce({ ok: false, error: 'FAILED' })],
    ['fails', () => setContributeEmailSettings.mockRejectedValueOnce(new Error('down'))],
  ])(
    "says so when the device's zone %s, never records it as sent, and sends it again on Try again",
    async (_how, fail) => {
      window.localStorage.setItem('gitranks:time-zone-sent', 'Europe/Lisbon');
      saveLearnEmailSettingsAction.mockResolvedValueOnce({
        ok: true,
        data: { ...learnEmail.chosen, timeZoneBy: 'DEVICE' },
      });
      fail();
      act(() =>
        root.render(
          <ul>
            <TimeZoneRow settings={learnEmail.chosen} savedZone="Europe/Berlin" />
          </ul>,
        ),
      );
      await openList();
      await choose('Europe/Lisbon');
      // The zone kept is still Berlin's, and the line does not say it came from the device.
      expect(row().textContent).toContain('Daily emails come in the morning, Berlin time.');
      expect(row().textContent).not.toContain('Taken from your device');
      expect(row().textContent).not.toContain('You chose it');
      expect(alert()?.textContent).toBe(
        "We couldn't save your device's time zone, so daily emails keep the one above.",
      );
      expect(window.localStorage.getItem('gitranks:time-zone-sent')).toBeNull();

      setContributeEmailSettings.mockResolvedValueOnce({ ok: true, data: { ...email.on, timeZone: 'Europe/Lisbon' } });
      const retry = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Try again');
      expect(retry).toBeDefined();
      await act(async () => retry!.click());
      expect(setContributeEmailSettings).toHaveBeenLastCalledWith({ timeZone: 'Europe/Lisbon' });
      expect(saveLearnEmailSettingsAction).toHaveBeenCalledTimes(1);
      expect(row().textContent).toContain('Lisbon time. Taken from your device.');
      expect(container.querySelector('[data-time-zone-unsaved]')).toBeNull();
      expect(window.localStorage.getItem('gitranks:time-zone-sent')).toBe('Europe/Lisbon');
    },
  );

  it('moves the zone back with why when the save fails, and saves nothing for the zone already in use', async () => {
    saveLearnEmailSettingsAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    act(() =>
      root.render(
        <ul>
          <TimeZoneRow settings={learnEmail.device} savedZone="Europe/Lisbon" />
        </ul>,
      ),
    );
    await openList();
    await choose('Asia/Tokyo');
    expect(row().textContent).toContain('Lisbon time. Taken from your device.');
    expect(alert()?.textContent).toBe('We could not save just now. Try again in a minute.');
    saveLearnEmailSettingsAction.mockClear();
    await openList();
    await choose('Europe/Lisbon');
    expect(saveLearnEmailSettingsAction).not.toHaveBeenCalled();
  });
});
