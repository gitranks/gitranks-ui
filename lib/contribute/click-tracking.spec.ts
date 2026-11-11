import { describe, expect, it } from 'vitest';

import {
  clickOf,
  contributeSource,
  entryOf,
  firstEntryOf,
  isLanding,
  LAST_CLICK_DAYS,
  lastClickOf,
} from './click-tracking';

const origin = 'https://gitranks.com';

describe('contributeSource', () => {
  it('is the one attribute the tracker reads', () => {
    expect(contributeSource('top_bar')).toEqual({ 'data-contribute-source': 'top_bar' });
  });
});

describe('clickOf: what a click counts as', () => {
  it('a marked link counts under its own mark, with where it goes', () => {
    expect(clickOf({ own: 'main_menu', href: '/contribute', pagePath: '/', origin })).toEqual({
      source: 'main_menu',
      target: '/contribute',
    });
  });

  it('a link to Contribute counts under the section around it, its query and hash dropped', () => {
    expect(
      clickOf({ around: 'profile_visitor_block', href: '/contribute/issues?x=1#a', pagePath: '/profile/a', origin }),
    ).toEqual({ source: 'profile_visitor_block', target: '/contribute/issues' });
    expect(clickOf({ around: 'footer', href: `${origin}/contribute`, pagePath: '/', origin })).toEqual({
      source: 'footer',
      target: '/contribute',
    });
  });

  it('an unmarked link to Contribute counts as other', () => {
    expect(clickOf({ href: '/contribute/mcp', pagePath: '/repo/a/b', origin })).toEqual({
      source: 'other',
      target: '/contribute/mcp',
    });
  });

  it('any other link in a marked section, and a link to another site, count nothing', () => {
    expect(clickOf({ around: 'footer', href: '/privacy', pagePath: '/', origin })).toBeNull();
    expect(clickOf({ href: 'https://example.com/contribute', pagePath: '/', origin })).toBeNull();
    expect(clickOf({ href: null, pagePath: '/', origin })).toBeNull();
  });

  it('a marked button counts without a destination', () => {
    expect(clickOf({ own: 'top_bar', href: null, pagePath: '/', origin })).toEqual({ source: 'top_bar' });
  });

  it('on Contribute’s own pages only its landing actions count, not moving around inside it', () => {
    expect(clickOf({ own: 'main_menu', href: '/contribute', pagePath: '/contribute/issues', origin })).toBeNull();
    expect(clickOf({ href: '/contribute/issues', pagePath: '/contribute', origin })).toBeNull();
    expect(clickOf({ own: 'contribute_landing', href: null, pagePath: '/contribute', origin })).toEqual({
      source: 'contribute_landing',
    });
  });
});

describe('entryOf: how the visit began', () => {
  it('reads the campaign tags, lowercased, and the other site', () => {
    expect(
      entryOf(
        '/contribute',
        '?utm_source=HN&utm_medium=social&utm_campaign=contribute_launch',
        'https://news.ycombinator.com/item?id=1',
        origin,
      ),
    ).toEqual({
      utmSource: 'hn',
      utmMedium: 'social',
      utmCampaign: 'contribute_launch',
      referrerHost: 'news.ycombinator.com',
    });
  });

  it('a visit from our own pages has no referrer, and a visit without tags is empty', () => {
    expect(entryOf('/contribute', '', `${origin}/by/stars/1`, origin)).toEqual({});
  });

  it('names our own untagged links: an agent’s sign-in link and a pull request’s footer', () => {
    expect(entryOf('/contribute', '?start=agent', '', origin)).toEqual({ utmSource: 'mcp_agent' });
    expect(entryOf('/contribute/maintainers', '?from=abc', 'https://github.com/', origin)).toEqual({
      utmSource: 'pr_footer',
      referrerHost: 'github.com',
    });
    expect(entryOf('/contribute', '?start=agent&utm_source=x', '', origin)).toEqual({ utmSource: 'x' });
    expect(entryOf('/contribute', '?start=agent', `${origin}/profile/a`, origin)).toEqual({});
    expect(entryOf('/contribute/connect', '?path=agent', '', origin)).toEqual({ utmSource: 'mcp_agent' });
  });

  it('reads Product Hunt’s own `ref` when the link has no utm_source', () => {
    expect(entryOf('/contribute', '?ref=producthunt', 'https://www.producthunt.com/', origin)).toEqual({
      utmSource: 'producthunt',
      referrerHost: 'www.producthunt.com',
    });
    expect(entryOf('/contribute', '?ref=producthunt&utm_source=x', '', origin)).toEqual({ utmSource: 'x' });
  });
});

describe('isLanding', () => {
  it('is a first page under /contribute', () => {
    expect(isLanding('/contribute')).toBe(true);
    expect(isLanding('/contribute/mcp')).toBe(true);
    expect(isLanding('/contributors')).toBe(false);
  });
});

describe('lastClickOf', () => {
  const now = Date.UTC(2026, 10, 11);
  it('keeps a whole click of the last 30 days', () => {
    const click = { source: 'top_bar', path: '/', at: now - 1000 };
    expect(lastClickOf(JSON.stringify(click), now)).toEqual(click);
  });
  it('drops an old, a malformed and a missing one', () => {
    const old = { source: 'top_bar', path: '/', at: now - (LAST_CLICK_DAYS + 1) * 24 * 60 * 60 * 1000 };
    expect(lastClickOf(JSON.stringify(old), now)).toBeNull();
    expect(lastClickOf('{"source":1}', now)).toBeNull();
    expect(lastClickOf('not json', now)).toBeNull();
    expect(lastClickOf(null, now)).toBeNull();
  });
});

describe('firstEntryOf', () => {
  const now = Date.UTC(2026, 10, 11);
  it('keeps a recent entry that names a channel, and only its known fields', () => {
    const stored = { entry: { utmSource: 'hackernews', utmCampaign: 'show-hn', extra: 'x' }, at: now - 1000 };
    expect(firstEntryOf(JSON.stringify(stored), now)).toEqual({ utmSource: 'hackernews', utmCampaign: 'show-hn' });
  });
  it('drops an old one, one without a channel and a malformed one', () => {
    const old = { entry: { utmSource: 'x' }, at: now - (LAST_CLICK_DAYS + 1) * 24 * 60 * 60 * 1000 };
    expect(firstEntryOf(JSON.stringify(old), now)).toBeNull();
    expect(firstEntryOf(JSON.stringify({ entry: {}, at: now }), now)).toBeNull();
    expect(firstEntryOf('[', now)).toBeNull();
  });
});
