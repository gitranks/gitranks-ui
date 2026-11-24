import { describe, expect, it } from 'vitest';

import {
  clickOf,
  contributeSource,
  entryOf,
  firstEntryOf,
  isFlowSource,
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

  it('the workspace’s pages under /my are inside too: moving around there counts nothing', () => {
    expect(clickOf({ href: '/contribute', pagePath: '/my/agent', origin })).toBeNull();
    expect(clickOf({ around: 'footer', href: '/my/settings', pagePath: '/my/pull-requests', origin })).toBeNull();
    expect(clickOf({ own: 'contribute_landing', href: null, pagePath: '/my/agent', origin })).toEqual({
      source: 'contribute_landing',
    });
  });

  it('a link to /my from outside the workspace counts as a step in, as one to Contribute', () => {
    expect(clickOf({ href: '/my/pull-requests?x=1', pagePath: '/profile/a', origin })).toEqual({
      source: 'other',
      target: '/my/pull-requests',
    });
    expect(
      clickOf({ around: 'learn_lesson', href: '/my/agent/connect', pagePath: '/learn/lessons/x', origin }),
    ).toEqual({ source: 'learn_lesson', target: '/my/agent/connect' });
  });

  it('never counts the workspace’s own tabs, from any page, Learn’s included', () => {
    const tab = contributeSource('workspace_tab')['data-contribute-source'];
    for (const pagePath of ['/learn', '/learn/lessons', '/my/agent', '/contribute']) {
      for (const href of ['/contribute', '/learn', '/my/pull-requests', '/my/agent', '/my/settings']) {
        expect(clickOf({ own: tab, href, pagePath, origin }), `${pagePath} → ${href}`).toBeNull();
        expect(clickOf({ around: tab, href, pagePath, origin }), `${pagePath} → ${href}`).toBeNull();
      }
    }
  });

  it('counts the header’s Learn from every page, Contribute’s own too', () => {
    for (const pagePath of ['/', '/contribute/issues', '/my/agent']) {
      expect(clickOf({ own: 'learn_menu', href: '/learn', pagePath, origin }), pagePath).toEqual({
        source: 'learn_menu',
        target: '/learn',
      });
    }
  });
});

describe('the flow that starts Contribute, and Learn’s landing', () => {
  it('count their marked steps on Contribute’s pages, where moving around counts nothing', () => {
    for (const own of [
      'contribute_flow_work',
      'contribute_flow_sign_in',
      'contribute_flow_own',
      'contribute_flow_key',
      'contribute_flow_issue',
      'contribute_flow_skip',
    ]) {
      expect(clickOf({ own, pagePath: '/contribute/start', origin }), own).toEqual({ source: own });
    }
    expect(clickOf({ href: '/contribute/start/agent', pagePath: '/contribute/start', origin })).toBeNull();
  });

  it('count Learn’s landing button, and the page it leads to', () => {
    expect(clickOf({ own: 'learn_landing', href: '/learn/courses', pagePath: '/learn', origin })).toEqual({
      source: 'learn_landing',
      target: '/learn/courses',
    });
  });

  it('are counted but never remembered for a connect', () => {
    for (const source of ['contribute_flow_work', 'contribute_flow_issue']) {
      expect(isFlowSource(source), source).toBe(true);
    }
    for (const source of ['contribute_landing', 'learn_landing', 'learn_start', 'main_menu']) {
      expect(isFlowSource(source), source).toBe(false);
    }
  });

  it('read an agent’s person arriving at the own-agent step as the agent’s channel', () => {
    expect(entryOf('/contribute/start/agent/own', '?from=agent', '', origin)).toEqual({ utmSource: 'mcp_agent' });
    expect(entryOf('/contribute/start/agent/own', '?from=profile', '', origin)).toEqual({});
    expect(entryOf('/contribute/start/agent/own', '?from=agent', `${origin}/contribute`, origin)).toEqual({});
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
    // Where `?start=agent` sends a signed-in person, and the old address's redirect lands.
    expect(entryOf('/my/agent/connect', '', '', origin)).toEqual({ utmSource: 'mcp_agent' });
    expect(entryOf('/my/agent/connect', '?path=agent', '', origin)).toEqual({ utmSource: 'mcp_agent' });
    expect(entryOf('/my/agent/connect', '', `${origin}/my/agent`, origin)).toEqual({});
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

  it('is a first page under /my whose entry names a source, not a bookmark', () => {
    const entry = (path: string, search = '', referrer = '') => entryOf(path, search, referrer, origin);
    expect(isLanding('/my/pull-requests', entry('/my/pull-requests', '?utm_source=email&utm_campaign=x'))).toBe(true);
    // An agent sending its person to connect it, straight or through the old address's redirect.
    expect(isLanding('/my/agent/connect', entry('/my/agent/connect'))).toBe(true);
    expect(isLanding('/my/agent/connect', entry('/my/agent/connect', '?path=agent&proof=A_1'))).toBe(true);
    // From our own pages, or a bookmark: not a landing.
    expect(isLanding('/my/agent/connect', entry('/my/agent/connect', '', `${origin}/my/agent`))).toBe(false);
    expect(isLanding('/my/settings', entry('/my/settings'))).toBe(false);
    expect(isLanding('/my/settings')).toBe(false);
    expect(isLanding('/learn', entry('/learn', '?utm_source=email'))).toBe(false);
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
