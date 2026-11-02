import { describe, expect, it } from 'vitest';

import { flowDraft, replyDraft } from './__fixtures__/contribute-attempts';
import { GITHUB_APPS_URL, isOrgRestricted, orgAccessOf, replyCopyOf, replyLinkOf } from './org-access';

describe('orgAccessOf', () => {
  it("links the app's own page, where each organization has a Request button", () => {
    expect(orgAccessOf('Ov23liAbc.1-x_2')).toEqual({
      url: 'https://github.com/settings/connections/applications/Ov23liAbc.1-x_2',
      app: true,
    });
  });

  it("falls back to the user's list of apps without an id, or with one that is not an id", () => {
    expect(orgAccessOf(undefined)).toEqual({ url: GITHUB_APPS_URL, app: false });
    expect(orgAccessOf('  ')).toEqual({ url: GITHUB_APPS_URL, app: false });
    expect(orgAccessOf('a/../b')).toEqual({ url: GITHUB_APPS_URL, app: false });
  });
});

describe('isOrgRestricted', () => {
  it('is the reason alone', () => {
    expect(isOrgRestricted('org_restricted')).toBe(true);
    expect(isOrgRestricted('forbidden')).toBe(false);
    expect(isOrgRestricted(null)).toBe(false);
  });
});

describe('replyCopyOf', () => {
  it('copies what an approval would post, or what was sent, once the API says it', () => {
    expect(replyCopyOf(flowDraft({ body: '🤖 Fixed in 46de700: Made it a const.' }))).toEqual({
      words: '🤖 Fixed in 46de700: Made it a const.',
      copyable: true,
    });
    expect(replyCopyOf(flowDraft({ state: 'FAILED', body: '🤖 Fixed in 46de700: Made it a const.' }))).toEqual({
      words: '🤖 Fixed in 46de700: Made it a const.',
      copyable: true,
    });
  });

  it('without it: the prefix and the text, not to copy while the prefix waits for its commit', () => {
    expect(replyCopyOf(flowDraft())).toEqual({ words: 'Fixed in the new commit: Made it a const.', copyable: false });
    expect(replyCopyOf(flowDraft({ prefix: 'Not changed: ', body: '  ' }))).toEqual({
      words: 'Not changed: Made it a const.',
      copyable: true,
    });
    expect(replyCopyOf(replyDraft({ body: null }))).toEqual({
      words: 'Good catch: the root path keeps its slash now, and a test covers it.',
      copyable: true,
    });
  });

  it("copies the user's edit, not the body it no longer is", () => {
    expect(replyCopyOf(flowDraft({ prefix: 'Fixed in 46de700: ', body: '🤖 Fixed in 46de700: x' }), 'Mine.')).toEqual({
      words: 'Fixed in 46de700: Mine.',
      copyable: true,
    });
  });

  it('copies the posted words once posted', () => {
    expect(replyCopyOf(flowDraft({ state: 'POSTED', text: 'Fixed in 46de700: Made it a const.', body: null }))).toEqual(
      { words: 'Fixed in 46de700: Made it a const.', copyable: true },
    );
    expect(replyCopyOf(flowDraft({ state: 'POSTED', text: 'x', body: '🤖 x' })).words).toBe('🤖 x');
  });
});

describe('replyLinkOf', () => {
  const thread = 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901';

  it('links the thread, or the pull request for a top-level comment, while it is not posted', () => {
    expect(replyLinkOf(replyDraft({ commentUrl: thread }))).toEqual({
      href: thread,
      label: 'Open the thread on GitHub ↗',
    });
    expect(
      replyLinkOf(replyDraft({ comment: null, commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419' })),
    ).toEqual({
      href: 'https://github.com/driftwood-js/driftwood/pull/1419',
      label: 'Open the pull request on GitHub ↗',
    });
  });

  it('links nothing once posted, without a link, or with one that is not GitHub', () => {
    expect(replyLinkOf(replyDraft({ state: 'POSTED', commentUrl: thread }))).toBeNull();
    expect(replyLinkOf(replyDraft())).toBeNull();
    expect(replyLinkOf(replyDraft({ commentUrl: 'javascript:alert(1)' }))).toBeNull();
    expect(replyLinkOf(replyDraft({ commentUrl: 'https://github.com.evil.example/x' }))).toBeNull();
  });
});
