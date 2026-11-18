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
    expect(shown).toContain('We stopped sending to this chat: it blocked our bot.');
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
});
