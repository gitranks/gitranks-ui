import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FollowingView } from './following-view';
import { subscriberOf } from '@/lib/link-token/__fixtures__/follow-links';

const text = (element: React.ReactElement) =>
  renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

describe('/following for a signed-in viewer', () => {
  it('names each address by its channel, and stops every channel at once', () => {
    const shown = text(
      <FollowingView
        session
        state={{
          kind: 'list',
          subscribers: [
            subscriberOf(),
            subscriberOf({ id: '6650a1b2c3d4e5f6a7b8c9ab', channel: 'TELEGRAM', addressHint: '…1234', paused: true }),
          ],
        }}
      />,
    );
    expect(shown).toContain('Email Packages you follow At m•••@gmail.com.');
    expect(shown).toContain('Telegram Packages you follow In the Telegram chat …1234.');
    expect(shown).toContain('Paused: this chat blocked our bot. Unblock it or write to it and updates start again.');
    expect(shown).toContain('Stop all package messages Unfollows every package, on every channel.');
    expect(shown).not.toContain('Email settings');
  });

  it('says when the account follows nothing yet', () => {
    expect(text(<FollowingView session state={{ kind: 'list', subscribers: [] }} />)).toBe(
      'Following Packages you follow You follow no packages yet. Follow one from its page on GitRanks.',
    );
  });

  it('keeps the email link’s page as it was', () => {
    const shown = text(<FollowingView state={{ kind: 'list', subscribers: [subscriberOf()] }} />);
    expect(shown).toContain('Email settings Packages you follow At m•••@gmail.com.');
    expect(shown).toContain('Stop all package email Unfollows every package at this address.');
  });

  it('says why a WhatsApp number is paused', () => {
    const whatsapp = subscriberOf({ channel: 'WHATSAPP', addressHint: '…5678', paused: true });
    expect(text(<FollowingView session state={{ kind: 'list', subscribers: [whatsapp] }} />)).toContain(
      "Paused: WhatsApp couldn't reach this number.",
    );
  });

  it.each([
    [{ kind: 'resumed', channel: 'TELEGRAM' }, 'We will send to this chat again.'],
    [{ kind: 'resumed', channel: 'EMAIL' }, 'We will send to this address again.'],
    [
      { kind: 'undo-refused', package: { registry: 'npm', name: 'x' }, channel: 'WHATSAPP' },
      'Could not follow x again: the chat may already follow',
    ],
    [{ kind: 'link-gone' }, 'That link no longer works; here is what your account follows.'],
    [{ kind: 'failed' }, 'That did not go through.'],
  ] as const)('says %o', (notice, words) => {
    expect(text(<FollowingView session state={{ kind: 'list', subscribers: [subscriberOf()], notice }} />)).toContain(
      words,
    );
  });

  it('asks a viewer whose session ended to sign in again', () => {
    const shown = renderToStaticMarkup(
      <FollowingView
        session
        onSignIn={() => {}}
        state={{ kind: 'list', subscribers: [subscriberOf()], notice: { kind: 'sign-in' } }}
      />,
    );
    expect(shown).toContain('You are signed out. Sign in again to change what you follow.');
    expect(shown).toContain('Sign in with GitHub');
  });
});
