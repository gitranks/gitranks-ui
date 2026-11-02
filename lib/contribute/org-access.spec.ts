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
  it('copies the words last sent to GitHub once there are some', () => {
    expect(replyCopyOf(flowDraft({ state: 'FAILED', body: '🤖 Fixed in 46de700: Made it a const.' }))).toBe(
      '🤖 Fixed in 46de700: Made it a const.',
    );
  });

  it('copies the prefix and the text before it was sent, as the page shows them', () => {
    expect(replyCopyOf(flowDraft())).toBe('Fixed in the new commit: Made it a const.');
    expect(replyCopyOf(replyDraft({ body: null }))).toBe(
      'Good catch: the root path keeps its slash now, and a test covers it.',
    );
    expect(replyCopyOf(replyDraft({ body: '   ' }))).toBe(
      'Good catch: the root path keeps its slash now, and a test covers it.',
    );
  });

  it('copies the posted text once posted', () => {
    expect(replyCopyOf(flowDraft({ state: 'POSTED', text: 'Fixed in 46de700: Made it a const.', body: 'x' }))).toBe(
      'Fixed in 46de700: Made it a const.',
    );
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
