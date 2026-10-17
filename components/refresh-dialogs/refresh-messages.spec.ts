import { describe, expect, it } from 'vitest';

import { fillTime, REFRESH_LABELS, REFRESH_MESSAGES } from './refresh-messages';

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
});
