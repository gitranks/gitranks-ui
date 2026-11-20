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

describe('the flows’ bookmark', () => {
  it('keeps each side’s last step, with its query', () => {
    const record = withBookmark(null, 'contribute', '/contribute/start/agent?languages=go', NOW);
    const both = withBookmark(record, 'learn', '/learn/start/acme/widgets/42?language=Go&level=1', NOW);
    expect(bookmarkOf(both, 'contribute', NOW)).toBe('/contribute/start/agent?languages=go');
    expect(bookmarkOf(both, 'learn', NOW)).toBe('/learn/start/acme/widgets/42?language=Go&level=1');
  });

  it(`is kept ${BOOKMARK_DAYS} days, then ignored and removed`, () => {
    const record = withBookmark(null, 'contribute', '/contribute/start', NOW);
    expect(bookmarkOf(record, 'contribute', NOW + 30 * DAY)).toBe('/contribute/start');
    expect(bookmarkOf(record, 'contribute', NOW + 30 * DAY + 1)).toBeNull();
    expect(keptBookmarks(record, NOW + 31 * DAY)).toBeNull();
    // Writing one side drops the other once it is too old.
    const later = withBookmark(record, 'learn', '/learn/start', NOW + 31 * DAY);
    expect(JSON.parse(later)).toEqual({ learn: { href: '/learn/start', at: NOW + 31 * DAY } });
  });

  it('accepts only a step of its own flow, on this site', () => {
    expect(isFlowHref('contribute', '/contribute/start')).toBe(true);
    expect(isFlowHref('contribute', '/contribute/start/issue')).toBe(true);
    expect(isFlowHref('learn', '/learn/start/issues?language=Go')).toBe(true);
    for (const href of [
      '/contribute',
      '/contribute/started',
      '/learn/start',
      '//evil.example/contribute/start',
      'https://evil.example/contribute/start',
      '/\\evil.example/contribute/start',
      'javascript:alert(1)',
      '/my/agent',
    ]) {
      expect(isFlowHref('contribute', href), href).toBe(false);
    }
    expect(isFlowHref('learn', '/contribute/start')).toBe(false);
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

  it('removes a side when its person leaves that flow, the other kept', () => {
    const both = withBookmark(withBookmark(null, 'contribute', '/contribute/start', NOW), 'learn', '/learn/start', NOW);
    const left = withoutBookmark(both, 'contribute', NOW);
    expect(bookmarkOf(left, 'contribute', NOW)).toBeNull();
    expect(bookmarkOf(left, 'learn', NOW)).toBe('/learn/start');
    expect(withoutBookmark(left, 'learn', NOW)).toBeNull();
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
    expect(
      resumeHrefOf({
        side: 'learn',
        server: r('/learn/start'),
        signedIn: true,
        bookmark: r('/learn/start/acme/widgets/42'),
      }),
    ).toBe('/learn/start');
  });

  it('on Learn, a picked issue wins over the server’s Pick an issue', () => {
    expect(
      resumeHrefOf({
        side: 'learn',
        server: r('/learn/start/issues'),
        signedIn: true,
        bookmark: r('/learn/start/acme/widgets/42'),
      }),
    ).toBe('/learn/start/acme/widgets/42');
    expect(
      resumeHrefOf({ side: 'learn', server: r('/learn/start/issues'), signedIn: true, bookmark: r('/learn/start') }),
    ).toBe('/learn/start/issues');
  });
});
