// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LandingProofCard } from './proof-card';
import { LandingProofRows } from './proof-rows';
import { LandingWayBox } from './way-box';
import { landingWays, proofMerged, proofOpenOnly } from '@/lib/contribute/__fixtures__/wave-4-parts';

const draw = (node: React.ReactElement) => {
  document.body.innerHTML = renderToStaticMarkup(node);
  return document.body;
};
/** What a person reads: each element's words apart, as the page lays them out. */
const text = (node: Element | null) =>
  node?.innerHTML
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

describe("the landing's top card", () => {
  it('shows the newest merged pull request: the issue, how it was made, the change and who sent it', () => {
    const page = draw(<LandingProofCard pr={proofMerged[0]} />);
    expect(text(page.querySelector('figure'))).toBe(
      [
        'driftwood-js/driftwood · #871 the issue',
        'Pagination skips the last page when the total is a multiple of the page size',
        'bug JavaScript / TypeScript',
        'an agent wrote the fix · a person reviewed it and sent it',
        'Merged 3 days after it was sent',
        'Count the last page when the total divides evenly',
        '+18 −3 2 files by mira-dev with Claude Code',
        'How it was made →',
        'A real pull request, the newest one merged through GitRanks.',
      ].join(' '),
    );
    expect(page.querySelector('a')?.getAttribute('href')).toBe('/contribute/pr/driftwood-js/driftwood/912');
  });

  it('leaves out what is not known', () => {
    const page = draw(<LandingProofCard pr={proofMerged[2]} />);
    expect(text(page)).toContain('Merged the day it was sent');
    expect(text(page)).not.toContain('files');
    expect(text(page)).toContain('The importer counts one email as two users Python');
  });

  it('says an open one is open, with no day it merged', () => {
    const page = draw(<LandingProofCard pr={proofOpenOnly[0]} />);
    expect(page.querySelector('[data-landing-proof-card]')?.getAttribute('data-landing-proof-card')).toBe('open');
    expect(text(page)).toContain('Open Stop the date picker');
    expect(text(page)).toContain('the newest one sent through GitRanks.');
    expect(text(page)).not.toContain('Merged');
  });
});

describe('"Merged through GitRanks"', () => {
  it('lists the rows with the ledger link while the ledger is open, and no count', () => {
    const page = draw(<LandingProofRows rows={proofMerged.slice(0, 3)} ledgerOpen />);
    expect([...page.querySelectorAll('li')].map((row) => text(row))).toEqual([
      'driftwood-js/driftwood Issue #871 Pull request #912 Count the last page when the total divides evenly Merged 30 Oct · by mira-dev with Claude Code How it was made',
      "harbor-kit/relay Issue #412 Pull request #418 Keep the retry delay when the queue reconnects Merged 27 Oct · by tomasz-k with GitRanks' hosted agent How it was made",
      'lumen-data/importer Issue #88 Pull request #93 Treat an email as one user whatever its case Merged 21 Oct · by ana-p with Claude Code How it was made',
    ]);
    expect(text(page.querySelector('a[href="/contribute/ledger"]'))).toBe('Every pull request, in the public ledger →');
  });

  it('stands the heading alone while the ledger is closed', () => {
    const page = draw(<LandingProofRows rows={proofMerged.slice(0, 3)} ledgerOpen={false} />);
    expect(page.querySelector('a[href="/contribute/ledger"]')).toBeNull();
    expect(text(page.querySelector('h2'))).toBe('Merged through GitRanks');
  });
});

describe('a box of "Two ways to contribute"', () => {
  it('draws a line on top, a title, one paragraph and four facts', () => {
    const page = draw(<LandingWayBox way={landingWays[1]} />);
    expect(text(page.querySelector('span'))).toBe('Your agent does the work');
    expect(text(page.querySelector('h3'))).toBe('With your own agent');
    expect([...page.querySelectorAll('dt')].map((term) => text(term))).toEqual([
      'You bring',
      'It spends',
      'The pace',
      'Setup',
    ]);
  });
});
