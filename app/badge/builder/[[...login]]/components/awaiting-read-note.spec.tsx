import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AwaitingReadNote, awaitingReadCopy } from './awaiting-read-note';
import { orgBig, repoMid, userMid } from '@/badge/v3/fixtures';

const render = (props: Partial<Parameters<typeof AwaitingReadNote>[0]> = {}) =>
  renderToStaticMarkup(
    <AwaitingReadNote facts={repoMid} checking={false} stillUnread={false} onCheck={() => {}} {...props} />,
  );

describe('AwaitingReadNote', () => {
  it("says the repository's star history is not read, with its page and Check again", () => {
    const html = render();
    expect(html).toContain('GitRanks hasn’t read this repository’s star history yet');
    expect(html).toContain('href="/repo/acme/fastqueue"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('Open its page and press Refresh');
    expect(html).toContain('Check again');
    expect(html).not.toContain('not read yet.');
  });

  it('says so after a check that found nothing new', () => {
    expect(render({ stillUnread: true })).toContain('Checked just now: not read yet.');
    expect(render({ stillUnread: true, checking: true })).toContain('Checking…');
  });

  it('leads a developer to their page; an organization has nothing to wait for', () => {
    const html = render({ facts: { ...userMid, s: null, c: null, f: null } });
    expect(html).toContain('GitRanks is still reading this developer from GitHub');
    expect(html).toContain('href="/profile/octo-dev"');
    expect(awaitingReadCopy(orgBig)).toBeNull();
    expect(render({ facts: orgBig })).toBe('');
  });
});
