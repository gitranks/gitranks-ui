import { describe, expect, it } from 'vitest';

import {
  DAILY_UPDATES_LINES,
  fillLogin,
  fillTime,
  REFRESH_LABELS,
  REFRESH_MESSAGES,
  withLogin,
} from './refresh-messages';
import { DAILY_UPDATES_NOTES } from '@/app/repo/[owner]/[name]/utils/pull-messages';

describe('refresh messages', () => {
  it('fills {time} wherever it appears', () => {
    expect(fillTime('Your next refresh is in {time}.', '5 h')).toBe('Your next refresh is in 5 h.');
  });

  it('puts {time} only in the messages that are opened with a time', () => {
    const withTime = Object.entries(REFRESH_MESSAGES)
      .filter(([, message]) => JSON.stringify(message).includes('{time}'))
      .map(([kind]) => kind);

    expect(withTime.sort()).toEqual(['blocked', 'used']);
  });

  it('never calls a refresh "free": the ones on a token are free too', () => {
    const copy = JSON.stringify({ REFRESH_MESSAGES, REFRESH_LABELS }).toLowerCase();
    expect(copy).not.toMatch(/\bfree refresh/);
    expect(REFRESH_LABELS.dailyAvailable.toLowerCase()).not.toContain('free');
  });

  it('shows the photo, and signs, only the notes that read as from the maker', () => {
    const withPhoto = Object.entries(REFRESH_MESSAGES)
      .filter(([, message]) => 'photo' in message && message.photo)
      .map(([kind]) => kind);
    const signed = Object.entries(REFRESH_MESSAGES)
      .filter(([, message]) => 'signature' in message)
      .map(([kind]) => kind);

    expect(withPhoto.sort()).toEqual(['needStar', 'signIn']);
    expect(signed).toEqual(['needStar']);
  });

  it("explains GitHub's consent screen only on someone else's profile", () => {
    const noted = Object.entries(REFRESH_MESSAGES)
      .filter(([, message]) => 'noteLink' in message)
      .map(([kind]) => kind);

    expect(noted).toEqual(['otherProfile']);
  });

  it('says why a profile updates every day, in the words of the design', () => {
    const owner = withLogin(REFRESH_MESSAGES.whyDailyOwner, 'octo-dev');
    const badge = withLogin(REFRESH_MESSAGES.whyDailyBadge, 'octo-dev');

    expect(owner).toEqual({
      title: 'This profile updates every day',
      paragraphs: [
        '@octo-dev signed in and starred our repo. So we update this profile every 24 hours.',
        'Want the same for your profile?',
      ],
      primary: 'Get daily updates',
      secondary: 'Close',
    });
    expect(badge).toEqual({
      title: 'This profile updates every day',
      paragraphs: [
        '@octo-dev has a GitRanks badge on GitHub. So we update this profile every 24 hours.',
        'Want the same? Add a badge to your GitHub profile.',
      ],
      primary: 'Make a badge',
      secondary: 'Close',
    });
  });

  it('puts {login} only in the copy that names the profile, and leaves other messages as they are', () => {
    const withLoginKinds = Object.entries(REFRESH_MESSAGES)
      .filter(([, message]) => JSON.stringify(message).includes('{login}'))
      .map(([kind]) => kind);

    expect(withLoginKinds.sort()).toEqual(['whyDailyBadge', 'whyDailyOwner']);
    expect(withLogin(REFRESH_MESSAGES.used, 'octo-dev')).toEqual(REFRESH_MESSAGES.used);
  });

  it('labels the button and its line as the design does', () => {
    expect(REFRESH_LABELS.updatesDaily).toBe('Updates daily');
    expect(fillLogin(DAILY_UPDATES_LINES.byOwner, 'octo-dev')).toBe('Turned on by @octo-dev.');
    expect(DAILY_UPDATES_LINES.byBadge).toBe('Has a GitRanks badge on GitHub.');
    expect(DAILY_UPDATES_NOTES).toEqual({
      byBadge: 'Updates daily: it has a GitRanks badge in its README.',
      byPick: 'Updates daily.',
    });
  });

  it('never tells who picked a repository', () => {
    expect(DAILY_UPDATES_NOTES.byPick).not.toMatch(/@|pick|by /i);
  });
});
