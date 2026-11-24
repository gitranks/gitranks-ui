import type { Route } from 'next';
import { describe, expect, it } from 'vitest';

import {
  BOOKMARK_DAYS,
  bookmarkOf,
  isFlowHref,
  keptBookmarks,
  resumeHrefOf,
  withBookmark,
  withoutBookmark,
} from './getting-in-bookmark';

/** An address as a link takes it: the flow's pages are typed routes once they exist. */
const r = (path: string) => path as Route;

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 20);

describe('the flow’s bookmark', () => {
  it('keeps the last step, with its query, and drops a side of a flow that is gone', () => {
    const record = withBookmark(null, 'contribute', '/contribute/start/agent?languages=go', NOW);
    expect(bookmarkOf(record, 'contribute', NOW)).toBe('/contribute/start/agent?languages=go');
    // A record written while Learn had its own flow: its side is never read again, and goes with the next write.
    const old = JSON.stringify({ ...JSON.parse(record), learn: { href: '/learn/start/issues', at: NOW } });
    expect(bookmarkOf(old, 'contribute', NOW)).toBe('/contribute/start/agent?languages=go');
    expect(JSON.parse(withBookmark(old, 'contribute', '/contribute/start', NOW))).toEqual({
      contribute: { href: '/contribute/start', at: NOW },
    });
  });

  it(`is kept ${BOOKMARK_DAYS} days, then ignored and removed`, () => {
    const record = withBookmark(null, 'contribute', '/contribute/start', NOW);
    expect(bookmarkOf(record, 'contribute', NOW + 30 * DAY)).toBe('/contribute/start');
    expect(bookmarkOf(record, 'contribute', NOW + 30 * DAY + 1)).toBeNull();
    expect(keptBookmarks(record, NOW + 31 * DAY)).toBeNull();
    // Writing again drops what is too old.
    const later = withBookmark(record, 'contribute', '/contribute/start/agent', NOW + 31 * DAY);
    expect(JSON.parse(later)).toEqual({ contribute: { href: '/contribute/start/agent', at: NOW + 31 * DAY } });
  });

  it('accepts only a step of its own flow, on this site', () => {
    expect(isFlowHref('contribute', '/contribute/start')).toBe(true);
    expect(isFlowHref('contribute', '/contribute/start/issue')).toBe(true);
    for (const href of [
      '/contribute',
      '/contribute/started',
      '/learn/start',
      '/learn/setup',
      '//evil.example/contribute/start',
      'https://evil.example/contribute/start',
      '/\\evil.example/contribute/start',
      'javascript:alert(1)',
      '/my/agent',
    ]) {
      expect(isFlowHref('contribute', href), href).toBe(false);
    }
    // A record naming another place is never followed.
    const forged = JSON.stringify({ contribute: { href: 'https://evil.example/', at: NOW } });
    expect(bookmarkOf(forged, 'contribute', NOW)).toBeNull();
    expect(withBookmark(null, 'contribute', '/profile/x', NOW)).toBe('{}');
  });

  it('reads a broken or missing record as none', () => {
    for (const stored of [null, '', 'not json', 'null', '[]', '{"contribute":{"href":"/contribute/start"}}']) {
      expect(bookmarkOf(stored, 'contribute', NOW), String(stored)).toBeNull();
    }
  });

  it('is removed when its person leaves the flow', () => {
    const record = withBookmark(null, 'contribute', '/contribute/start', NOW);
    expect(withoutBookmark(record, 'contribute', NOW)).toBeNull();
  });
});

describe('resumeHrefOf: where a landing’s button leads', () => {
  it('a visitor resumes at the bookmark, else the server’s step', () => {
    expect(resumeHrefOf({ side: 'contribute', server: r('/contribute/start'), signedIn: false, bookmark: null })).toBe(
      '/contribute/start',
    );
    expect(
      resumeHrefOf({
        side: 'contribute',
        server: r('/contribute/start'),
        signedIn: false,
        bookmark: r('/contribute/start/agent?kinds=bug'),
      }),
    ).toBe('/contribute/start/agent?kinds=bug');
  });

  it('a signed-in person gets the server’s step whatever the bookmark says', () => {
    expect(
      resumeHrefOf({
        side: 'contribute',
        server: r('/contribute/start/agent'),
        signedIn: true,
        bookmark: r('/contribute/start'),
      }),
    ).toBe('/contribute/start/agent');
  });
});
