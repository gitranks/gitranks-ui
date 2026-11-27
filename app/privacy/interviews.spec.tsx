import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeShown: vi.fn(async () => false) }));

// Whether Interviews is open to everyone, and the day its section first shows: flipped here to draw both cases.
const open = vi.hoisted(() => ({ everyone: false, updated: null as string | null }));
vi.mock('./interviews-open', () => ({
  get INTERVIEWS_OPEN_TO_EVERYONE() {
    return open.everyone;
  },
  get INTERVIEWS_PRIVACY_UPDATED() {
    return open.updated;
  },
}));

const { default: Privacy } = await import('./page');
const real = await vi.importActual<typeof import('./interviews-open')>('./interviews-open');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const PARAGRAPH =
  'GitRanks Interviews sets out a company\'s interview rounds as an interview plan, with Learn lessons to prepare for them. For My interviews , we keep the interview plans you started and when, when you finished or stopped one and why you stopped it (if you said), and each "This is wrong" report you sent about a fact, with its note. When you learn a lesson inside a plan, your progress in Learn also keeps which plan you learned it in. Your interview plans are not publicly visible. A report never shows your name. We keep all of this until you delete it: Delete all data in Settings and removing your data from GitRanks (see Removing your data ) delete it. Basis: contract (Article 6(1)(b)), to provide what you ask for.';

describe("the Privacy policy's GitRanks Interviews section", () => {
  afterEach(() => {
    open.everyone = false;
    open.updated = null;
  });

  it('is not on the page, nor in its contents, while Interviews is closed, and the date stays', () => {
    const html = renderToStaticMarkup(<Privacy />);
    expect(html).not.toContain('id="interviews"');
    expect(html).not.toContain('href="#interviews"');
    expect(text(html)).not.toContain('Interviews');
    expect(text(html)).toContain('Last updated 25 November 2026');
  });

  it('shows once Interviews is open to everyone, after Learn, with its day as the last update', () => {
    open.everyone = true;
    open.updated = '2026-12-01';
    const html = renderToStaticMarkup(<Privacy />);
    const plain = text(html);
    expect(html).toContain('id="interviews"');
    expect(html).toContain('href="#interviews"');
    expect(html.indexOf('id="learn"')).toBeLessThan(html.indexOf('id="interviews"'));
    expect(html.indexOf('id="interviews"')).toBeLessThan(html.indexOf('id="following"'));
    expect(plain).toContain(PARAGRAPH);
    expect(html).toContain('href="#removal"');
    expect(plain).toContain('Last updated 1 December 2026');
  });

  it('says the plans are not publicly visible and never that we do not share them', () => {
    open.everyone = true;
    const plain = text(renderToStaticMarkup(<Privacy />));
    const section = plain.slice(
      plain.indexOf('GitRanks Interviews sets out'),
      plain.indexOf('Following a package', plain.indexOf('GitRanks Interviews sets out')),
    );
    expect(section).toContain('Your interview plans are not publicly visible.');
    expect(section).not.toMatch(/never share|not share|don't share|do not share|claim|\u2014|\u2013/i);
  });

  it('has a day for its last update whenever it is open', () => {
    if (real.INTERVIEWS_OPEN_TO_EVERYONE) expect(real.INTERVIEWS_PRIVACY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
