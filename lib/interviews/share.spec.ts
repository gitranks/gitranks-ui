import { describe, expect, it } from 'vitest';

import { northwindPage } from './__fixtures__/companies';
import {
  interviewCardHeadersOf,
  interviewMarkdownHeadersOf,
  interviewNotServedResponse,
  interviewShareStateOf,
} from './share';

describe("a company's or a plan's state, as its picture and its copy find it", () => {
  it('is live with the page, whatever the address says', () => {
    expect(interviewShareStateOf(northwindPage, null)).toEqual({ kind: 'live', page: northwindPage });
  });

  it('follows the address when the page is not live: moved, gone, missing, or a read that failed', () => {
    expect(interviewShareStateOf(null, { state: 'moved', to: '/interviews/northwind/senior-engineer' })).toEqual({
      kind: 'moved',
      path: '/interviews/northwind/senior-engineer',
    });
    expect(interviewShareStateOf(null, { state: 'moved', to: 'northwind' })).toEqual({
      kind: 'moved',
      path: '/interviews/northwind',
    });
    expect(interviewShareStateOf(null, { state: 'gone', to: null })).toEqual({ kind: 'gone' });
    expect(interviewShareStateOf(null, { state: 'missing', to: null })).toEqual({ kind: 'missing' });
    expect(interviewShareStateOf(null, null)).toEqual({ kind: 'unavailable' });
  });

  it('never sends anyone off the site, and reads a live address with no page as missing for now', () => {
    expect(interviewShareStateOf(null, { state: 'moved', to: 'https://example.test/x' })).toEqual({ kind: 'missing' });
    expect(interviewShareStateOf(null, { state: 'moved', to: null })).toEqual({ kind: 'missing' });
    expect(interviewShareStateOf(null, { state: 'live', to: null })).toEqual({ kind: 'missing' });
  });
});

describe('what is answered when the page is not served', () => {
  it('sends a moved page to the same thing at its new address, kept nowhere', () => {
    const response = interviewNotServedResponse({ kind: 'moved', path: '/interviews/northwind' as never }, '.md');
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/interviews/northwind.md');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('answers gone 410, missing 404 and a failed read 503, all kept nowhere', () => {
    const gone = interviewNotServedResponse({ kind: 'gone' }, '/card.png');
    const missing = interviewNotServedResponse({ kind: 'missing' }, '/card.png');
    const unavailable = interviewNotServedResponse({ kind: 'unavailable' }, '/card.png');
    expect([gone.status, missing.status, unavailable.status]).toEqual([410, 404, 503]);
    expect(unavailable.headers.get('retry-after')).toBe('60');
    for (const response of [gone, missing, unavailable]) {
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    }
  });
});

describe('how a picture and a copy are kept', () => {
  it('by no one while Interviews is not open to everyone, as the gate’s 404 is', () => {
    expect(interviewCardHeadersOf()).toEqual({ 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' });
    expect(interviewCardHeadersOf(false)['Cache-Control']).toBe('private, no-store');
    expect(interviewMarkdownHeadersOf()['Cache-Control']).toBe('private, no-store');
  });

  it("as Learn's are once Interviews is open to everyone", () => {
    expect(interviewCardHeadersOf(true)).toEqual({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=600',
    });
    expect(interviewMarkdownHeadersOf(true)['Cache-Control']).toBe('public, max-age=60, s-maxage=60');
  });

  it('never lets a copy be indexed: the page itself is', () => {
    for (const open of [true, false]) {
      expect(interviewMarkdownHeadersOf(open)).toMatchObject({
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Robots-Tag': 'noindex',
        'X-Content-Type-Options': 'nosniff',
      });
    }
  });
});
