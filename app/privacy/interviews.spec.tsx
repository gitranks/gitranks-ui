import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { legalDate } from '@/lib/legal';

vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeShown: vi.fn(async () => false) }));

// Whether Interviews is open to everyone: flipped here to draw both cases.
const open = vi.hoisted(() => ({ everyone: false }));
vi.mock('./interviews-open', () => ({
  get INTERVIEWS_OPEN_TO_EVERYONE() {
    return open.everyone;
  },
}));

const { default: Privacy } = await import('./page');
const { INTERVIEWS_PRIVACY_UPDATED, PRIVACY_UPDATED, privacyUpdated } = await import('./privacy-updated');
const real = await vi.importActual<typeof import('./interviews-open')>('./interviews-open');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const PARAGRAPH =
  'GitRanks Interviews sets out a company\'s interview rounds as an interview plan, with Learn lessons to prepare for them. For My interviews , we keep the interview plans you started and when, when you finished or stopped one and why you stopped it (if you said), and your latest "This is wrong" report on each fact, with its note. When you learn a lesson inside a plan, your progress in Learn also keeps which plan you learned it in. Your interview plans are not publicly visible. A report never shows your name. We keep all of this until you delete it: Delete all data in Settings and removing your data from GitRanks (see Removing your data ) delete it. Basis: contract (Article 6(1)(b)), to provide what you ask for.';

describe("the Privacy policy's GitRanks Interviews section", () => {
  afterEach(() => {
    open.everyone = false;
  });

  it("is not on the page, nor in its contents, while Interviews is closed, and the date is the policy's own", () => {
    const html = renderToStaticMarkup(<Privacy />);
    expect(html).not.toContain('id="interviews"');
    expect(html).not.toContain('href="#interviews"');
    expect(text(html)).not.toContain('Interviews');
    expect(text(html)).toContain(`Last updated ${legalDate(PRIVACY_UPDATED)}`);
  });

  it('shows once Interviews is open to everyone, between Learn and Following a package', () => {
    open.everyone = true;
    const html = renderToStaticMarkup(<Privacy />);
    const plain = text(html);
    expect(html).toContain('id="interviews"');
    expect(html).toContain('href="#interviews"');
    expect(html.indexOf('id="learn"')).toBeLessThan(html.indexOf('id="interviews"'));
    expect(html.indexOf('id="interviews"')).toBeLessThan(html.indexOf('id="following"'));
    expect(plain).toContain(PARAGRAPH);
    expect(html).toContain('href="#removal"');
    expect(plain).toContain(`Last updated ${legalDate(privacyUpdated(true))}`);
  });

  it('says the plans are not publicly visible and never that we do not share them', () => {
    open.everyone = true;
    const plain = text(renderToStaticMarkup(<Privacy />));
    const start = plain.indexOf('GitRanks Interviews sets out');
    const section = plain.slice(start, plain.indexOf('Following a package', start));
    expect(section).toContain('Your interview plans are not publicly visible.');
    expect(section).not.toMatch(/never share|not share|don't share|do not share|claim|\u2014|\u2013/i);
  });
});

describe("the policy's last updated day", () => {
  it("is the policy's own while the Interviews section is hidden, whatever day it has", () => {
    expect(privacyUpdated(false, '2026-11-25', '2026-12-01')).toBe('2026-11-25');
  });

  it('is the later of the two once the section shows', () => {
    expect(privacyUpdated(true, '2026-11-25', '2026-12-01')).toBe('2026-12-01');
    expect(privacyUpdated(true, '2027-01-10', '2026-12-01')).toBe('2027-01-10');
    expect(privacyUpdated(true, '2026-11-25', null)).toBe('2026-11-25');
  });

  it('has a day for the Interviews section whenever it shows', () => {
    if (real.INTERVIEWS_OPEN_TO_EVERYONE) expect(INTERVIEWS_PRIVACY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('the switch the section waits for', () => {
  it("is Interviews' own constant once that is on main, not a second copy here", () => {
    // When `lib/interviews/interviews-parts.ts` is in the tree, the page imports its constant and this file goes.
    if (existsSync(join(ROOT, 'lib/interviews/interviews-parts.ts'))) {
      expect(existsSync(join(ROOT, 'app/privacy/interviews-open.ts'))).toBe(false);
    }
  });
});
