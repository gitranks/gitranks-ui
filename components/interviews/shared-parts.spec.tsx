// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));

const { CompanyLogo } = await import('./company-logo');
const { BasisChip } = await import('./sources/basis-chip');
const { SourcesInPlace } = await import('./sources/sources-in-place');
const { SourceList } = await import('./sources/source-list');
const { WrongForm } = await import('./sources/wrong-form');
const { REPORT_WORDS } = await import('@/lib/interviews/report');
const { IDENTITY_PROVIDER } = await import('@/lib/auth-providers');
const { northwind, northwindSources, tallgrass, tallgrassSources } = await import(
  '@/lib/interviews/__fixtures__/companies'
);

const REPORT = { company: 'northwind', plan: 'senior-software-engineer', fact: 'process' };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  hint.present = true;
  signIn.mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const render = (node: React.ReactNode) => act(async () => root.render(node));
const buttonNamed = (name: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === name) ?? null;
const press = (name: string) => act(async () => buttonNamed(name)?.click());
const textarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
const type = (value: string) =>
  act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea(), value);
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
  });
const send = () => act(async () => container.querySelector('form')?.requestSubmit());

describe("a company's logo", () => {
  it('draws the picture at each of the four sizes, from the file that size needs', () => {
    for (const [size, file] of [
      [16, 64],
      [20, 64],
      [28, 128],
      [40, 128],
    ] as const) {
      const html = renderToStaticMarkup(<CompanyLogo company={northwind} size={size} />);
      expect(html).toContain(`src="/interviews/northwind/logo-${file}.png"`);
      expect(html).toContain(`width="${size}"`);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('alt=""');
    }
  });

  it('draws the first letter in the same square for a company with no logo', () => {
    const html = renderToStaticMarkup(<CompanyLogo company={tallgrass} size={40} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('data-company-letter');
    expect(html).toMatch(/>T<\/span>$/);
    expect(html).toContain('width:40px');
    expect(html).toContain('font-size:20px');
  });
});

describe('who states a fact', () => {
  it('ticks a fact the company states, and draws a reported one quiet', () => {
    expect(renderToStaticMarkup(<BasisChip basis="official" company="Northwind" />)).toMatch(
      /<svg[^>]*>.*<\/svg>Northwind states/,
    );
    const reported = renderToStaticMarkup(<BasisChip basis="reported" company="Northwind" />);
    expect(reported).not.toContain('<svg');
    expect(reported).toContain('Candidates report');
  });
});

describe('the sources, in place', () => {
  it('shows the first four, then the rest where "N more sources" stood', async () => {
    await render(<SourceList sources={northwindSources} company="Northwind" />);
    expect(container.querySelectorAll('[data-source]')).toHaveLength(4);
    expect(container.querySelector('[data-source="o1"]')?.textContent).toBe(
      "How we interviewcareers.northwind.example · Northwind's own page · May 2026",
    );
    expect(container.querySelector('[data-source="o1"] a')?.getAttribute('target')).toBe('_blank');
    await press('4 more sources');
    expect(container.querySelectorAll('[data-source]')).toHaveLength(8);
    expect(buttonNamed('4 more sources')).toBeNull();
  });

  it('opens under the facts with the day they were read, and closes again', async () => {
    await render(
      <SourcesInPlace
        sources={tallgrassSources}
        company="Tallgrass"
        report={REPORT}
        label="What is wrong with these facts?"
        after="Sources disagree on one thing."
      />,
    );
    const toggle = buttonNamed('3 sources');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('Where these facts come from');
    await press('3 sources');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Where these facts come from');
    expect(container.textContent).toContain(
      'We read these on 26 Nov 2026 and wrote the facts in our own words. Sources disagree on one thing.',
    );
    expect(container.textContent).toContain('read through search results');
    await press('3 sources');
    expect(container.textContent).not.toContain('Where these facts come from');
  });

  it('holds "This is wrong" alone with no source, and opens its short form apart from the sources', async () => {
    await render(<SourcesInPlace sources={[]} company="Tallgrass" report={REPORT} label="What is wrong?" />);
    expect(buttonNamed('0 sources')).toBeNull();
    expect(container.textContent).not.toMatch(/\b0\b/);
    await press('This is wrong');
    expect(container.querySelector('[data-wrong-form]')).not.toBeNull();
    await press('Cancel');
    expect(container.querySelector('[data-wrong-form]')).toBeNull();
  });
});

describe('the short form of "This is wrong"', () => {
  const form = (onClose = () => {}) => (
    <WrongForm report={REPORT} label="What is wrong with these facts?" placeholder="Say what" onClose={onClose} />
  );
  const state = () => container.querySelector('[data-wrong-form]')?.getAttribute('data-wrong-form');

  it('asks a visitor to sign in, and comes back to the same page', async () => {
    hint.present = false;
    await render(form());
    expect(state()).toBe('visitor');
    expect(container.textContent).toContain(REPORT_WORDS.signIn);
    expect(textarea()).toBeNull();
    await press('Sign in with GitHub');
    expect(signIn).toHaveBeenCalledWith(IDENTITY_PROVIDER, { redirectTo: '/' });
  });

  it('sends a note only once it holds words, and gives way to one line once sent', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ ok: true, data: true }));
    vi.stubGlobal('fetch', fetch);
    await render(form());
    expect(state()).toBe('writing');
    expect(document.activeElement).toBe(textarea());
    expect(buttonNamed('Send')?.disabled).toBe(true);
    await type('   ');
    expect(buttonNamed('Send')?.disabled).toBe(true);
    await type('  There are four rounds now. ');
    expect(buttonNamed('Send')?.disabled).toBe(false);
    await send();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe('/api/me/interviews/report');
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({
      ...REPORT,
      note: 'There are four rounds now.',
    });
    expect(state()).toBe('sent');
    expect(container.textContent).toBe(REPORT_WORDS.sent);
  });

  it("says so past the day's limit and on a failure, keeping the note", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: false, error: 'LIMITED' }, { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    await render(form());
    await type('Wrong count.');
    await send();
    expect(state()).toBe('limited');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(REPORT_WORDS.limited);
    expect(textarea().value).toBe('Wrong count.');

    fetch.mockImplementation(async () => new Response('down', { status: 502 }));
    await send();
    expect(state()).toBe('failed');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(REPORT_WORDS.failed);
  });

  it('asks for a sign-in when the session is gone, and closes on Cancel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: false, error: 'SIGNED_OUT' }, { status: 401 })),
    );
    const onClose = vi.fn();
    await render(form(onClose));
    await type('Wrong count.');
    await send();
    expect(state()).toBe('visitor');
    await press('Cancel');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
