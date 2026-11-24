import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LedgerScreen } from './ledger-view';
import { emptyLedger, ledger, publicLedger } from '@/lib/contribute/__fixtures__/ledger';

describe('LedgerScreen', () => {
  it('shows the bar only in the preview', () => {
    expect(renderToStaticMarkup(<LedgerScreen ledger={ledger} />)).toContain('Preview: only you see this page');
    expect(renderToStaticMarkup(<LedgerScreen ledger={publicLedger} />)).not.toContain('Preview');
  });

  it('shows totals, the merge rate, each PR with its state, and no reason per repo', () => {
    const html = renderToStaticMarkup(<LedgerScreen ledger={publicLedger} />);
    expect(html).toContain('50%');
    expect(html).toContain('1 of 2 decided');
    expect(html).toContain('in 4 repositories, by 1 person');
    expect(html).toContain('https://github.com/quill-charts/quill/pull/88');
    expect(html).toContain('Closed');
    expect(html).toContain('Not now');
    expect(html).toContain(
      '“Not now”: the repo said no, or a maintainer closed one of our pull requests saying the project takes no AI-made pull requests, or asking us to stay away.',
    );
    expect(html).not.toMatch(/60 days|in a row/);
    expect(html).not.toMatch(/Paused to|AI policy says no<\/td>/);
  });

  it('counts the repos that said no: a reason at zero, and the retired pause, are not shown', () => {
    const paused = { ...publicLedger, saidNo: { ...publicLedger.saidNo, paused: 3 } };
    const html = renderToStaticMarkup(<LedgerScreen ledger={paused} />);
    expect(html).toContain('data-total="hostile-close"');
    expect(html).toContain('Asked us to stay away');
    expect(html).toContain('data-total="closed-no-ai"');
    expect(html).toContain('Said no AI-made PRs');
    expect(html).not.toContain('data-total="outside-prs-closed"');
    expect(html).not.toContain('data-total="paused"');
    expect(html).not.toMatch(/retired rule|Paused after/);
  });

  it('says it in words when no repo said no', () => {
    const none = {
      ...publicLedger,
      saidNo: { ...publicLedger.saidNo, total: 0, optedOut: 0, hostileClose: 0, closedNoAi: 0, aiPolicy: 0 },
    };
    const html = renderToStaticMarkup(<LedgerScreen ledger={none} />);
    expect(html).toContain('No repo has said no so far.');
    expect(html).not.toContain('data-total="total"');
  });

  it('shows no zero count and no dash: a zero or a missing rate is said in words', () => {
    const totals = {
      ...publicLedger.totals,
      merged: 0,
      closed: 0,
      mergeRate: null,
      latestMerged: null,
      latestClosed: null,
    };
    const html = renderToStaticMarkup(<LedgerScreen ledger={{ ...publicLedger, totals }} />);
    expect(html).toContain('None yet');
    expect(html).toContain('None decided yet');
    expect(html).not.toContain('—');
    expect(html).not.toMatch(/>0</);
  });

  it('says so before the first PR, with no totals, chart or tables', () => {
    const html = renderToStaticMarkup(<LedgerScreen ledger={emptyLedger} />);
    expect(html).toContain('No pull requests yet');
    expect(html).not.toContain('data-ledger="recent"');
    expect(html).not.toContain('data-total="opened"');
    expect(html).not.toContain('—');
  });
});
