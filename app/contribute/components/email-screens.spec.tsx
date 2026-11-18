// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setContributeEmail } = vi.hoisted(() => ({ setContributeEmail: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({ setContributeEmail }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));

const { EMAIL_AUTOPILOT_NOTE, EMAIL_OFF, EMAIL_TITLE, EmailSection } = await import('./email-section');
const { SettingsScreen } = await import('./settings-view');
const { NOW, views } = await import('@/lib/contribute/__fixtures__/contribute-views');

import type { ContributeEmail } from '@/lib/contribute/contribute.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TO = 'o•••@example.com';
const ON_LINE = `Review reminders and updates go to ${TO}.`;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ');

const settings = (email?: ContributeEmail | null) =>
  renderToStaticMarkup(<SettingsScreen view={views.active} now={NOW} email={email} />);

describe("Settings' email row", () => {
  it('says where the email goes when it is on, under its own anchor, with the autopilot note', () => {
    const html = settings({ on: true, to: TO });
    const row = html.slice(html.indexOf('id="email"'));

    expect(html).toContain('id="settings-email"');
    expect(row).toContain('data-email="on"');
    expect(text(row)).toContain(EMAIL_TITLE);
    expect(text(row)).toContain(ON_LINE);
    expect(text(row)).toContain(EMAIL_AUTOPILOT_NOTE);
    expect(row).toMatch(/role="switch"[^>]*aria-checked="true"/);
    expect(row).toContain(`aria-label="${EMAIL_TITLE}"`);
    expect(row).toMatch(/type="checkbox"[^>]*checked=""/);
  });

  it('says it is off, and the switch is off', () => {
    const html = settings({ on: false, to: TO });
    const row = html.slice(html.indexOf('id="email"'));

    expect(row).toContain('data-email="off"');
    expect(text(row)).toContain(EMAIL_OFF);
    expect(text(row)).not.toContain(TO);
    expect(text(row)).toContain(EMAIL_AUTOPILOT_NOTE);
    expect(row).toMatch(/role="switch"[^>]*aria-checked="false"/);
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
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const toggle = () => container.querySelector<HTMLInputElement>('input[role="switch"]')!;
  const value = () => container.querySelector('#email')?.textContent ?? '';

  it('is reached by its label, and turning it off saves at once and says it is off', async () => {
    let save: (result: unknown) => void = () => {};
    setContributeEmail.mockReturnValue(new Promise((resolve) => (save = resolve)));
    act(() => root.render(<EmailSection email={{ on: true, to: TO }} />));
    const label = container.querySelector(`label[for="${toggle().id}"]`);
    expect(label?.textContent).toBe('On');
    expect(toggle().getAttribute('aria-describedby')).toBeTruthy();

    await act(async () => toggle().click());

    expect(setContributeEmail).toHaveBeenCalledWith(false);
    // It moves at once, before the save answers.
    expect(toggle().checked).toBe(false);
    expect(value()).toContain(EMAIL_OFF);

    await act(async () => save({ ok: true, data: { on: false, to: TO } }));
    expect(toggle().checked).toBe(false);
    expect(toggle().disabled).toBe(false);
    expect(container.querySelector('[data-email]')?.getAttribute('data-email')).toBe('off');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('turns it back on, and shows the address the API answers', async () => {
    setContributeEmail.mockResolvedValue({ ok: true, data: { on: true, to: TO } });
    act(() => root.render(<EmailSection email={{ on: false, to: 'x•••@example.com' }} />));

    await act(async () => toggle().click());

    expect(setContributeEmail).toHaveBeenCalledWith(true);
    expect(toggle().checked).toBe(true);
    expect(value()).toContain(ON_LINE);
  });

  it('moves back and says why when the save fails', async () => {
    setContributeEmail.mockResolvedValue({ ok: false, error: 'FAILED' });
    act(() => root.render(<EmailSection email={{ on: true, to: TO }} />));

    await act(async () => toggle().click());

    expect(toggle().checked).toBe(true);
    expect(value()).toContain(ON_LINE);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Something went wrong. Try again in a minute.');
  });

  it('moves back when the call itself throws', async () => {
    setContributeEmail.mockRejectedValue(new Error('network'));
    act(() => root.render(<EmailSection email={{ on: false, to: TO }} />));

    await act(async () => toggle().click());

    expect(toggle().checked).toBe(false);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
