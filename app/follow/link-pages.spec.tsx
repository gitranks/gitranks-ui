import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DIALOG, followOf, RESIZE, subscriberOf } from '@/lib/link-token/__fixtures__/follow-links';
import { LINK_PAGE_HEADERS } from '@/lib/link-token/link-token';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const { ConfirmView } = await import('./components/confirm-view');
const { UnfollowView } = await import('./components/unfollow-view');
const { FollowingView } = await import('@/app/following/components/following-view');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();
const render = (element: React.ReactElement) => text(renderToStaticMarkup(element));

describe('every page a link opens', () => {
  it.each([
    ['./confirm/page', 'Confirm a follow'],
    ['./unfollow/page', 'Unfollow a package'],
    ['@/app/following/page', 'Email settings'],
  ])('%s is noindex and passes no address on', async (path, title) => {
    const { metadata } = await import(/* @vite-ignore */ path);
    expect(metadata).toEqual({ title, robots: { index: false, follow: false }, referrer: 'no-referrer' });
  });

  it('is sent with no-referrer, noindex and no-store headers (next.config)', async () => {
    const { default: config } = await import('@/next.config');
    const entries = (await config.headers?.()) ?? [];
    for (const source of ['/follow/:path*', '/following', '/following/']) {
      const entry = entries.find((each) => each.source === source);
      expect(Object.fromEntries((entry?.headers ?? []).map(({ key, value }) => [key, value]))).toEqual(
        LINK_PAGE_HEADERS,
      );
    }
    expect(LINK_PAGE_HEADERS).toEqual({
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, no-store',
    });
  });

  it('says a link without its cookie has timed out, the same way on each page', () => {
    const timedOut = 'This link has timed out Open it from your email again.';
    expect(render(<ConfirmView state={{ kind: 'timed-out' }} />)).toBe(timedOut);
    expect(render(<UnfollowView state={{ kind: 'timed-out' }} />)).toBe(timedOut);
    expect(render(<FollowingView state={{ kind: 'timed-out' }} />)).toBe(timedOut);
    expect(render(<ConfirmView state={{ kind: 'unavailable' }} />)).toBe(
      'Following is not available right now Nothing was changed. Try again in a few minutes.',
    );
  });
});

describe('/follow/confirm', () => {
  it('pending: the packages, what will be sent, and one Confirm button', () => {
    const html = renderToStaticMarkup(
      <ConfirmView
        state={{ kind: 'pending', packages: [RESIZE], events: { notable: true, digest: false, milestones: true } }}
      />,
    );
    expect(text(html)).toBe(
      'Confirm your email Confirm updates about react-resize-detector We will email you: ' +
        'when a repository with 1,000+ stars starts using it ' +
        'milestones, like its first 10 million downloads in a month ' +
        'Confirm Nothing is followed until you press Confirm. Every email lets you unfollow.',
    );
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('type="submit"');
  });

  it('several packages: each one by name, linked to its page', () => {
    const html = renderToStaticMarkup(
      <ConfirmView state={{ kind: 'pending', packages: [RESIZE, DIALOG], events: null }} />,
    );
    expect(text(html)).toContain('Confirm updates about react-resize-detector and @radix-ui/react-dialog');
    expect(html).toContain('href="/package/npm/react-resize-detector"');
    expect(html).toContain('href="/package/npm/@radix-ui/react-dialog"');
  });

  it('confirmed, with the settings link the press opened', () => {
    const html = renderToStaticMarkup(
      <ConfirmView state={{ kind: 'confirmed', packages: [RESIZE], settings: true }} />,
    );
    expect(text(html)).toBe(
      'Confirmed You follow react-resize-detector We will email you about it as you asked. ' +
        'Change what you get, or unfollow, in Email settings .',
    );
    expect(html).toContain('href="/following"');
    expect(html).not.toContain('<button');
  });

  it('already confirmed: the packages, and no way into the settings', () => {
    const html = renderToStaticMarkup(<ConfirmView state={{ kind: 'already-confirmed', packages: [RESIZE] }} />);
    expect(text(html)).toBe(
      'Already confirmed You follow react-resize-detector. To change what you get, open Email settings from any email about it.',
    );
    expect(html).not.toContain('href="/following"');
    expect(html).not.toContain('<button');
  });

  it('expired and unknown links', () => {
    expect(render(<ConfirmView state={{ kind: 'expired' }} />)).toBe(
      'This link has expired A confirmation link works for 7 days. Follow the package again from its page on GitRanks to get a new one.',
    );
    expect(render(<ConfirmView state={{ kind: 'unknown' }} />)).toBe(
      'This link does not work Open it from your email again, or follow the package again from its page on GitRanks.',
    );
  });
});

describe('/follow/unfollow', () => {
  const state = { kind: 'follow', follow: followOf(), addressHint: 'm•••@gmail.com' } as const;

  it('one Unfollow button, and nothing changed on the way in', () => {
    const html = renderToStaticMarkup(<UnfollowView state={state} />);
    expect(text(html)).toBe(
      'Unfollow Unfollow react-resize-detector? We email m•••@gmail.com about it. Unfollow, and we stop. Unfollow',
    );
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('value="remove"');
  });

  it('after the press, Undo for 7 days', () => {
    const html = renderToStaticMarkup(<UnfollowView state={{ ...state, follow: followOf({ status: 'REMOVED' }) }} />);
    expect(text(html)).toBe(
      'Unfollowed You unfollowed react-resize-detector We will not email m•••@gmail.com about react-resize-detector again. ' +
        'Changed your mind? You can undo this for 7 days. Undo',
    );
    expect(html).toContain('value="undo"');
  });

  it('after Undo, following again', () => {
    expect(render(<UnfollowView state={{ ...state, note: 'undone' }} />)).toContain(
      'Following again Unfollow react-resize-detector? You follow it again.',
    );
  });

  it('a refused Undo: its own notice, and no Undo button', () => {
    const html = renderToStaticMarkup(
      <UnfollowView state={{ ...state, follow: followOf({ status: 'REMOVED' }), note: 'undo-refused' }} />,
    );
    expect(text(html)).toBe(
      'Unfollowed You unfollowed react-resize-detector Could not follow react-resize-detector again: the address may ' +
        'already follow as many packages as it can, or the follow is gone. Follow it again from its page on GitRanks.',
    );
    expect(html).not.toContain('<button');
  });

  it('a follow never confirmed, unfollowed: nothing to undo', () => {
    const html = renderToStaticMarkup(
      <UnfollowView state={{ ...state, follow: followOf({ status: 'REMOVED' }), note: 'deleted' }} />,
    );
    expect(text(html)).toBe(
      'Unfollowed You unfollowed react-resize-detector We will not email m•••@gmail.com about react-resize-detector ' +
        'again. It was never confirmed, so there is nothing to undo.',
    );
    expect(html).not.toContain('<button');
  });

  it('a link that reaches no follow', () => {
    expect(render(<UnfollowView state={{ kind: 'unknown' }} />)).toBe(
      'This link does not work This follow may have been removed already. Open the link from your latest email about the package.',
    );
  });
});

describe('/following', () => {
  it('every follow of the address with its three switches and Unfollow, and Stop all package email', () => {
    const html = renderToStaticMarkup(<FollowingView state={{ kind: 'list', subscribers: [subscriberOf()] }} />);
    expect(text(html)).toBe(
      'Email settings Packages you follow At m•••@gmail.com. Choose what we send about each package, or unfollow it. ' +
        'react-resize-detector Unfollow New 1,000+ star users Monthly digest Milestones ' +
        '@radix-ui/react-dialog Unfollow New 1,000+ star users Monthly digest Milestones ' +
        'Stop all package email Unfollows every package at this address.',
    );
    expect(html.match(/role="checkbox"/g)).toHaveLength(6);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(4);
  });

  it('a paused address, an unfollowed package with Undo, and what the last press did', () => {
    const subscriber = subscriberOf({
      paused: true,
      follows: [
        followOf({ status: 'REMOVED' }),
        followOf({ id: '6650a1b2c3d4e5f6a7b8c9d2', status: 'PENDING', package: DIALOG }),
      ],
    });
    const html = renderToStaticMarkup(
      <FollowingView state={{ kind: 'list', subscribers: [subscriber], notice: { kind: 'stopped', count: 3 } }} />,
    );
    const shown = text(html);
    expect(shown).toContain('Unfollowed 3 packages. You can undo each one below for 7 days.');
    expect(shown).toContain('We stopped sending to this address: it refused our email twice. Send again');
    expect(shown).toContain('react-resize-detector Unfollowed Undo');
    expect(shown).toContain('@radix-ui/react-dialog Not confirmed yet Unfollow');
    expect(html.match(/role="checkbox"/g)).toHaveLength(3);
  });

  it('nothing followed: no Stop all', () => {
    const html = renderToStaticMarkup(
      <FollowingView state={{ kind: 'list', subscribers: [subscriberOf({ follows: [] })] }} />,
    );
    expect(text(html)).toContain('You follow no packages at this address.');
    expect(text(html)).not.toContain('Stop all package email');
  });

  it('a refused Undo says so', () => {
    expect(
      render(
        <FollowingView
          state={{ kind: 'list', subscribers: [subscriberOf()], notice: { kind: 'undo-refused', package: DIALOG } }}
        />,
      ),
    ).toContain('Could not follow @radix-ui/react-dialog again: the address may already follow as many packages');
  });

  it('a change that did not go through', () => {
    expect(
      render(<FollowingView state={{ kind: 'list', subscribers: [subscriberOf()], notice: { kind: 'failed' } }} />),
    ).toContain('That did not go through. Try again in a few minutes.');
  });
});
