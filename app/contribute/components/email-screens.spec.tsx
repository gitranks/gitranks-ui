// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setContributeEmail, refresh } = vi.hoisted(() => ({ setContributeEmail: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmail }));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));

const { EMAIL_AUTOPILOT_NOTE, EMAIL_OFF, EMAIL_TITLE, EmailSection } = await import(
  '@/components/workspace/settings/email-section'
);
const { SettingsScreen } = await import('./settings-view');
const { NOW, email: fixture, views } = await import('@/lib/contribute/__fixtures__/contribute-views');

import type { ContributeEmail } from '@/lib/workspace/contribute.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TO = fixture.on.to;
const ON_LINE = `Review reminders and other Contribute email go to ${TO}.`;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ');

const settings = (email?: ContributeEmail | null) =>
  renderToStaticMarkup(<SettingsScreen view={views.active} now={NOW} email={email} />);

describe("Settings' email row", () => {
  it('says where the email goes when it is on, under its own anchor, with the autopilot note', () => {
    const html = settings(fixture.on);
    const row = html.slice(html.indexOf('id="email"'));

    expect(html).toContain('id="settings-email"');
    expect(row).toContain('data-email="on"');
    expect(text(row)).toContain(EMAIL_TITLE);
    expect(EMAIL_TITLE).toBe('Email from Contribute');
    expect(text(row)).toContain(ON_LINE);
    expect(text(row)).toContain(EMAIL_AUTOPILOT_NOTE);
    expect(row).toContain(`aria-label="${EMAIL_TITLE}"`);
    // A native checkbox: `checked` carries the state, so no aria-checked; never disabled, so focus stays on it.
    expect(row).toMatch(/type="checkbox"[^>]*role="switch"[^>]*checked=""/);
    expect(row).not.toContain('aria-checked');
    expect(row).not.toMatch(/<input[^>]*\sdisabled=/);
  });

  it('says it is off, and the switch is off', () => {
    const html = settings(fixture.off);
    const row = html.slice(html.indexOf('id="email"'));

    expect(row).toContain('data-email="off"');
    expect(text(row)).toContain(EMAIL_OFF);
    expect(EMAIL_OFF).toBe('Off. You get no review reminders or other Contribute email.');
    expect(text(row)).not.toContain(TO);
    expect(text(row)).toContain(EMAIL_AUTOPILOT_NOTE);
    expect(row).toMatch(/<input[^>]*role="switch"/);
    expect(row).not.toMatch(/<input[^>]*checked=""/);
  });

  it.each([
    ['hidden', null],
    ['not read', undefined],
    ['on without an address', { on: true, to: null }],
    ['off without an address', { on: false, to: null }],
  ] as const)('is left out when the email is %s, and the page still renders', (_, email) => {
    const html = settings(email);

    expect(html).not.toContain('id="email"');
    expect(html).not.toContain('id="settings-email"');
    expect(text(html)).not.toContain(EMAIL_TITLE);
    expect(text(html)).toContain('Connections');
  });
});

describe('the email switch', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    setContributeEmail.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const toggle = () => container.querySelector<HTMLInputElement>('input[role="switch"]')!;
  const value = () => container.querySelector('#email')?.textContent ?? '';
  /** The save waits until `save` answers it. */
  const held = () => {
    let save: (result: unknown) => void = () => {};
    setContributeEmail.mockReturnValue(new Promise((resolve) => (save = resolve)));
    return (result: unknown) => save(result);
  };

  it('is reached by its label, and turning it off saves at once, says it is off and refreshes the page', async () => {
    const save = held();
    act(() => root.render(<EmailSection email={fixture.on} />));
    const label = container.querySelector(`label[for="${toggle().id}"]`);
    expect(label?.textContent).toBe('On');
    expect(toggle().getAttribute('aria-describedby')).toBeTruthy();

    await act(async () => toggle().click());

    expect(setContributeEmail).toHaveBeenCalledWith(false);
    // It moves at once, before the save answers, and stays focusable while it saves.
    expect(toggle().checked).toBe(false);
    expect(toggle().disabled).toBe(false);
    expect(toggle().getAttribute('aria-disabled')).toBe('true');
    expect(value()).toContain(EMAIL_OFF);
    expect(refresh).not.toHaveBeenCalled();

    await act(async () => save({ ok: true, data: { on: false, to: TO } }));
    expect(toggle().checked).toBe(false);
    expect(toggle().hasAttribute('aria-disabled')).toBe(false);
    expect(container.querySelector('[data-email]')?.getAttribute('data-email')).toBe('off');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ignores another change while one is saving', async () => {
    const save = held();
    act(() => root.render(<EmailSection email={fixture.on} />));

    await act(async () => toggle().click());
    await act(async () => toggle().click());
    await act(async () => toggle().click());

    expect(setContributeEmail).toHaveBeenCalledTimes(1);
    expect(toggle().checked).toBe(false);

    await act(async () => save({ ok: true, data: { on: false, to: TO } }));
    // Saved, it takes the next change.
    setContributeEmail.mockResolvedValue({ ok: true, data: { on: true, to: TO } });
    await act(async () => toggle().click());
    expect(setContributeEmail).toHaveBeenLastCalledWith(true);
    expect(toggle().checked).toBe(true);
  });

  it('turns it back on, and shows the address the API answers', async () => {
    setContributeEmail.mockResolvedValue({ ok: true, data: { on: true, to: TO } });
    act(() => root.render(<EmailSection email={{ on: false, to: 'x•••@example.com' }} />));

    await act(async () => toggle().click());

    expect(setContributeEmail).toHaveBeenCalledWith(true);
    expect(toggle().checked).toBe(true);
    expect(value()).toContain(ON_LINE);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('drops out, without the old address, when the save answers no address, and refreshes the page', async () => {
    setContributeEmail.mockResolvedValue({ ok: true, data: { on: true, to: null } });
    act(() => root.render(<EmailSection email={fixture.off} />));

    await act(async () => toggle().click());

    expect(container.querySelector('#email')).toBeNull();
    expect(container.querySelector('#settings-email')).toBeNull();
    expect(container.textContent).not.toContain(TO);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('moves back and says why when the save fails, without a refresh', async () => {
    setContributeEmail.mockResolvedValue({ ok: false, error: 'FAILED' });
    act(() => root.render(<EmailSection email={fixture.on} />));

    await act(async () => toggle().click());

    expect(toggle().checked).toBe(true);
    expect(value()).toContain(ON_LINE);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Something went wrong. Try again in a minute.');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('moves back when the call itself throws, and takes the next change', async () => {
    setContributeEmail.mockRejectedValueOnce(new Error('network'));
    act(() => root.render(<EmailSection email={fixture.off} />));

    await act(async () => toggle().click());

    expect(toggle().checked).toBe(false);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    setContributeEmail.mockResolvedValue({ ok: true, data: { on: true, to: TO } });
    await act(async () => toggle().click());
    expect(setContributeEmail).toHaveBeenCalledTimes(2);
    expect(toggle().checked).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
