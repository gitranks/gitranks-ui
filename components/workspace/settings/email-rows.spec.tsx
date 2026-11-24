// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn() }));

const { setContributeEmailSettings, refresh } = vi.hoisted(() => ({
  setContributeEmailSettings: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmailSettings }));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/learn/settings.data', () => ({ loadLearnEmailSettings: vi.fn(), loadLearnSetupForSettings: vi.fn() }));
vi.mock('@/lib/skills/skills.data', () => ({}));
vi.mock('@/lib/learn/settings.actions', () => ({ saveLearnEmailSettingsAction: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
}));

const { EmailRows } = await import('./email-rows');
const { SettingsScreen } = await import('@/app/(workspace)/my/settings/components/settings-view');
const { email: fixture, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { EMAIL_AUTOPILOT_NOTE, EMAIL_NO_ADDRESS, EMAIL_READ_FAILED, NEEDS_YOU_COVERS } = await import(
  '@/lib/workspace/email-settings'
);

import type { ComponentProps } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TO = fixture.on.to;
const IMMEDIATELY_LINE = NEEDS_YOU_COVERS;
const OFF_LINE = `${NEEDS_YOU_COVERS} No email for these: they still show under Pull requests.`;
const dailyLine = (city: string) =>
  `${NEEDS_YOU_COVERS} One summary a day at 8:00 in the morning, ${city} time, while something waits.`;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ');

const settings = (props: Partial<ComponentProps<typeof SettingsScreen>> = {}) =>
  renderToStaticMarkup(<SettingsScreen view={views.active} {...props} />);

describe("Settings' Email rows, as the server draws them", () => {
  it('shows both rows with the stored values, under the #email anchor, with where the email goes', () => {
    const html = settings({ email: fixture.on });
    const group = html.slice(html.indexOf('id="email"'));
    const plain = text(group);

    expect(plain).toContain(`When a pull request needs you ${IMMEDIATELY_LINE}`);
    expect(group).toMatch(/type="radio"[^>]*checked=""[^>]*value="AFTER_30_MINUTES"/);
    expect(group.match(/<input[^>]*type="radio"[^>]*checked=""/g)).toHaveLength(1);
    expect(plain).toContain('Immediately Once a day Off');
    expect(plain).toContain('When a pull request is merged or closed One email each time.');
    expect(group).toMatch(/type="checkbox"[^>]*role="switch"[^>]*checked=""/);
    expect(plain).toContain(`Email goes to ${TO}.`);
    expect(plain).not.toContain('review reminder');
    // Autopilot's note only while autopilot is on.
    expect(plain).not.toContain(EMAIL_AUTOPILOT_NOTE);
    expect(group).not.toMatch(/<(input|fieldset)[^>]*\sdisabled=/);
  });

  it.each([
    ['Once a day, with the stored zone', fixture.daily, dailyLine('Warsaw'), 'On'],
    ['Off and off', fixture.off, OFF_LINE, 'Off'],
  ] as const)('says what %s sends', (_, email, line, ended) => {
    const plain = text(settings({ email }));
    expect(plain).toContain(`When a pull request needs you ${line}`);
    expect(plain).toContain(
      `When a pull request is merged or closed ${ended === 'On' ? 'One email each time.' : 'No email when a pull request is merged or closed.'} ${ended}`,
    );
  });

  it('names UTC for Once a day while no zone is known (the browser tells its own once it loads)', () => {
    const plain = text(settings({ email: { ...fixture.daily, timeZone: null } }));
    expect(plain).toContain(dailyLine('UTC'));
  });

  it('adds the autopilot note while autopilot is on', () => {
    const html = renderToStaticMarkup(<EmailRows settings={fixture.on} autopilotOn />);
    expect(text(html)).toContain(`Email goes to ${TO}. ${EMAIL_AUTOPILOT_NOTE}`);
  });

  it('disables both controls under one line when there is no address, and offers no switch hint', () => {
    const html = renderToStaticMarkup(<EmailRows settings={fixture.noAddress} hint="ONCE_A_DAY" autopilotOn />);
    expect(html).toMatch(/<fieldset[^>]*disabled=""/);
    expect(html).toMatch(/<input[^>]*role="switch"[^>]*disabled=""/);
    expect(text(html)).toContain(EMAIL_NO_ADDRESS);
    expect(EMAIL_NO_ADDRESS).toBe(
      'We have no email address for you, so no email is sent. Sign in again and share your GitHub email.',
    );
    expect(text(html)).not.toContain('Email goes to');
    expect(html).not.toContain('data-email-hint');
  });

  it("holds Learn's rows before and after these, and alone where the API hides these", () => {
    const lead = <li data-email-row="lead" />;
    const tail = <li data-email-row="tail" />;
    const rows = (html: string) => [...html.matchAll(/data-email-row="([a-z-]+)"/g)].map((match) => match[1]);
    expect(rows(renderToStaticMarkup(<EmailRows settings={fixture.on} lead={lead} tail={tail} />))).toEqual([
      'lead',
      'needs-you',
      'ended',
      'tail',
    ]);
    const alone = renderToStaticMarkup(<EmailRows settings={null} lead={lead} tail={tail} />);
    expect(rows(alone)).toEqual(['lead', 'tail']);
    expect(alone).not.toContain('data-email="failed"');
    const failed = renderToStaticMarkup(<EmailRows settings={undefined} tail={tail} />);
    expect(rows(failed)).toEqual(['tail']);
    expect(text(failed)).toContain(`${EMAIL_READ_FAILED} Try again`);
  });

  it('leaves the zone out of the summary line where a Time zone row says it', () => {
    const html = renderToStaticMarkup(<EmailRows settings={fixture.daily} zoneRow />);
    expect(text(html)).toContain(
      `${NEEDS_YOU_COVERS} One summary a day at 8:00 in the morning, while something waits.`,
    );
  });

  it('is left out when the API hides it, and says it did not load when the read failed', () => {
    const hidden = settings({ email: null });
    expect(hidden).not.toContain('id="email"');
    expect(text(hidden)).toContain('GitHub access');

    const failed = settings({ email: null, emailFailed: true });
    expect(failed).toContain('id="email"');
    expect(text(failed)).toContain(`${EMAIL_READ_FAILED} Try again`);
    expect(failed).not.toContain('type="radio"');
  });

  it('asks before switching when an email link offers another choice, and says nothing when it is the stored one', () => {
    const daily = text(settings({ email: fixture.on, emailHint: 'ONCE_A_DAY' }));
    expect(daily).toContain('Switch to one summary a day? Switch Keep immediate emails');
    const after30 = text(settings({ email: fixture.off, emailHint: 'AFTER_30_MINUTES' }));
    expect(after30).toContain('Switch to immediate emails? Switch Keep emails off');
    expect(settings({ email: fixture.daily, emailHint: 'ONCE_A_DAY' })).not.toContain('data-email-hint');
  });
});

describe('the Email rows in the browser', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // Only the timers: the browser's time zone is read from the real `Intl`.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    setContributeEmailSettings.mockReset();
    refresh.mockReset();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/my/settings');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const radio = (value: string) => container.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)!;
  const toggle = () => container.querySelector<HTMLInputElement>('input[role="switch"]')!;
  const needsYouLine = () => container.querySelector('[data-email-row="needs-you"]')?.textContent ?? '';
  const alert = () => container.querySelector('[role="alert"]')?.textContent ?? null;
  const button = (label: string) =>
    [...container.querySelectorAll('button')].find((each) => each.textContent === label) as HTMLButtonElement;
  /** The save waits until `answer` answers it. */
  const held = () => {
    let answer: (result: unknown) => void = () => {};
    setContributeEmailSettings.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    return (result: unknown) => answer(result);
  };
  const zone = (name: string | undefined) =>
    vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: name } as Intl.ResolvedDateTimeFormatOptions);
  const mount = (props: Partial<ComponentProps<typeof EmailRows>> = {}) =>
    act(() => root.render(<EmailRows settings={fixture.on} {...props} />));
  const pick = async (value: string) => {
    await act(async () => radio(value).click());
    await act(async () => vi.advanceTimersByTime(400));
  };

  it('moves the choice at once, saves it with the browser’s zone, says what it sends and refreshes the page', async () => {
    zone('America/New_York');
    const answer = held();
    mount({ settings: { ...fixture.on, timeZone: null } });

    await act(async () => radio('ONCE_A_DAY').click());
    // Moved before the save is sent; the line names the browser's zone while none is stored.
    expect(radio('ONCE_A_DAY').checked).toBe(true);
    expect(needsYouLine()).toContain(dailyLine('New York'));
    expect(setContributeEmailSettings).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(400));
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ needsYou: 'ONCE_A_DAY', timeZone: 'America/New_York' });
    expect(refresh).not.toHaveBeenCalled();

    await act(async () =>
      answer({ ok: true, data: { ...fixture.on, needsYou: 'ONCE_A_DAY', timeZone: 'America/New_York' } }),
    );
    expect(radio('ONCE_A_DAY').checked).toBe(true);
    expect(alert()).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
    // The zone sent is the one this browser keeps as sent, so a visit does not send it again.
    expect(window.localStorage.getItem('gitranks:time-zone-sent')).toBe('America/New_York');
  });

  it('saves only the last of several quick picks (arrowing through the choices)', async () => {
    zone('Europe/Warsaw');
    setContributeEmailSettings.mockResolvedValue({ ok: true, data: fixture.off });
    mount();

    await act(async () => radio('ONCE_A_DAY').click());
    await act(async () => radio('OFF').click());
    await act(async () => vi.advanceTimersByTime(400));

    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ needsYou: 'OFF', timeZone: 'Europe/Warsaw' });
  });

  it('sends a pick still waiting in the same save when the merged-or-closed switch is pressed', async () => {
    zone('Europe/Warsaw');
    setContributeEmailSettings.mockResolvedValue({
      ok: true,
      data: { ...fixture.on, needsYou: 'ONCE_A_DAY', ended: false },
    });
    mount();

    await act(async () => radio('ONCE_A_DAY').click());
    await act(async () => vi.advanceTimersByTime(100));
    await act(async () => toggle().click());
    // The pick's own timer finds nothing left to save.
    await act(async () => vi.advanceTimersByTime(400));

    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);
    expect(setContributeEmailSettings).toHaveBeenCalledWith({
      needsYou: 'ONCE_A_DAY',
      ended: false,
      timeZone: 'Europe/Warsaw',
    });
    expect(radio('ONCE_A_DAY').checked).toBe(true);
    expect(toggle().checked).toBe(false);
  });

  it('lets the hint’s Switch win over a pick still waiting, in one save', async () => {
    zone(undefined);
    setContributeEmailSettings.mockResolvedValue({ ok: true, data: fixture.daily });
    mount({ hint: 'ONCE_A_DAY' });

    await act(async () => radio('OFF').click());
    // Off differs from the hint too, so the question stays up.
    await act(async () => button('Switch').click());
    await act(async () => vi.advanceTimersByTime(400));

    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ needsYou: 'ONCE_A_DAY' });
    expect(radio('ONCE_A_DAY').checked).toBe(true);
  });

  it('still saves when the browser tells no usable zone', async () => {
    zone('Etc/Unknown');
    setContributeEmailSettings.mockResolvedValue({ ok: true, data: { ...fixture.on, ended: false } });
    mount();

    await act(async () => toggle().click());

    expect(setContributeEmailSettings).toHaveBeenCalledWith({ ended: false });
    expect(toggle().checked).toBe(false);
    expect(window.localStorage.getItem('gitranks:time-zone-sent')).toBeNull();
  });

  it('turns the merged-or-closed switch off at once, and ignores another change while it saves', async () => {
    zone(undefined);
    const answer = held();
    mount();

    await act(async () => toggle().click());
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ ended: false });
    expect(toggle().checked).toBe(false);
    expect(toggle().disabled).toBe(false);
    expect(toggle().getAttribute('aria-disabled')).toBe('true');
    expect(container.textContent).toContain('No email when a pull request is merged or closed.');

    await act(async () => toggle().click());
    await pick('OFF');
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);
    expect(radio('AFTER_30_MINUTES').checked).toBe(true);

    await act(async () => answer({ ok: true, data: { ...fixture.on, ended: false } }));
    expect(toggle().hasAttribute('aria-disabled')).toBe(false);
    // Saved, it takes the next change.
    setContributeEmailSettings.mockResolvedValue({ ok: true, data: { ...fixture.on, ended: false, needsYou: 'OFF' } });
    await pick('OFF');
    expect(setContributeEmailSettings).toHaveBeenLastCalledWith({ needsYou: 'OFF' });
    expect(needsYouLine()).toContain(OFF_LINE);
  });

  it('follows a zone saved elsewhere on the page once the page is read again', async () => {
    mount({ settings: fixture.daily });
    expect(needsYouLine()).toContain(dailyLine('Warsaw'));
    mount({ settings: { ...fixture.daily, timeZone: 'Europe/Berlin' } });
    expect(needsYouLine()).toContain(dailyLine('Berlin'));
  });

  it('moves back and says why when the save fails, without a refresh', async () => {
    zone(undefined);
    setContributeEmailSettings.mockResolvedValue({ ok: false, error: 'FAILED' });
    mount();

    await pick('OFF');

    expect(radio('AFTER_30_MINUTES').checked).toBe(true);
    expect(needsYouLine()).toContain(IMMEDIATELY_LINE);
    expect(alert()).toBe('Something went wrong. Try again in a minute.');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('moves back when the call itself throws, and takes the next change', async () => {
    zone(undefined);
    setContributeEmailSettings.mockRejectedValueOnce(new Error('network'));
    mount();

    await act(async () => toggle().click());
    expect(toggle().checked).toBe(true);
    expect(alert()).not.toBeNull();

    setContributeEmailSettings.mockResolvedValue({ ok: true, data: { ...fixture.on, ended: false } });
    await act(async () => toggle().click());
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(2);
    expect(toggle().checked).toBe(false);
    expect(alert()).toBeNull();
  });

  it('Switch saves the choice the email offered and takes the hint out of the address', async () => {
    zone('Europe/Warsaw');
    window.history.replaceState(null, '', '/my/settings?email=daily#email');
    setContributeEmailSettings.mockResolvedValue({ ok: true, data: fixture.daily });
    mount({ hint: 'ONCE_A_DAY' });
    expect(container.querySelector('[data-email-hint]')?.textContent).toContain('Switch to one summary a day?');

    await act(async () => button('Switch').click());

    expect(setContributeEmailSettings).toHaveBeenCalledWith({ needsYou: 'ONCE_A_DAY', timeZone: 'Europe/Warsaw' });
    expect(radio('ONCE_A_DAY').checked).toBe(true);
    expect(container.querySelector('[data-email-hint]')).toBeNull();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/my/settings#email');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the hint, with why, when Switch fails', async () => {
    zone(undefined);
    window.history.replaceState(null, '', '/my/settings?email=daily#email');
    setContributeEmailSettings.mockResolvedValue({ ok: false, error: 'FAILED' });
    mount({ hint: 'ONCE_A_DAY' });

    await act(async () => button('Switch').click());

    expect(container.querySelector('[data-email-hint]')).not.toBeNull();
    expect(radio('AFTER_30_MINUTES').checked).toBe(true);
    expect(alert()).not.toBeNull();
    expect(window.location.search).toBe('?email=daily');
  });

  it('Keep only takes the hint away, from the page and the address', async () => {
    window.history.replaceState(null, '', '/my/settings?email=after-30#email');
    mount({ settings: fixture.daily, hint: 'AFTER_30_MINUTES' });

    await act(async () => button('Keep once a day').click());

    expect(setContributeEmailSettings).not.toHaveBeenCalled();
    expect(container.querySelector('[data-email-hint]')).toBeNull();
    expect(radio('ONCE_A_DAY').checked).toBe(true);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/my/settings#email');
  });

  it('offers Try again where the read failed, which reads the page again', async () => {
    mount({ settings: undefined });
    expect(container.textContent).toContain(EMAIL_READ_FAILED);

    await act(async () => button('Try again').click());
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
