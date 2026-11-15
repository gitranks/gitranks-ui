import { describe, expect, it } from 'vitest';

import {
  fillRepo,
  PICK_DIALOGS,
  PICK_LABELS,
  PICK_LINES,
  PICK_MESSAGES,
  PICKS_MAX,
  picksLeftText,
} from './pick-messages';
import { fillTime } from '@/components/refresh-dialogs/refresh-messages';

describe('pick messages', () => {
  it('labels the button and its line as the design does', () => {
    expect(PICK_LABELS).toEqual({ updateDaily: 'Update daily', updatesDaily: 'Updates daily' });
    expect(PICK_LINES).toEqual({ off: 'Uses 1 of your 3 picks.', yourPick: 'Your pick.' });
  });

  it('words the list and the full dialog as the design does', () => {
    expect(PICK_DIALOGS.yourDailyUpdates).toEqual({
      title: 'Your daily updates',
      paragraph: 'We update these every day. They stay on for 7 days after your last visit.',
      note: 'You can add 3 picks a day.',
      primary: 'Done',
      secondary: 'Close',
    });
    expect(fillRepo(PICK_DIALOGS.allPicksUsed.paragraph, 'brightfern/tidepool')).toBe(
      'Remove one to update brightfern/tidepool every day.',
    );
    expect([PICK_DIALOGS.allPicksUsed.title, PICK_DIALOGS.allPicksUsed.secondary]).toEqual([
      'All 3 picks are used',
      'Cancel',
    ]);
  });

  it('says when the next new pick opens', () => {
    expect(fillTime(PICK_DIALOGS.dailyLimit.paragraph, '12 h')).toBe(
      'You can add 3 picks a day. The next one opens in 12 h.',
    );
  });

  it('counts the picks left in plain words', () => {
    expect(picksLeftText(1)).toBe('1 pick left');
    expect(picksLeftText(2)).toBe('2 picks left');
    expect(PICKS_MAX).toBe(3);
  });

  it('asks for the star in the voice of the other star dialogs', () => {
    expect(PICK_MESSAGES.needStar).toMatchObject({
      photo: true,
      signature: '— Vitalii',
      secondary: 'I starred it, pick',
    });
  });

  it('never names anyone who picked a repository', () => {
    const copy = JSON.stringify({ PICK_LABELS, PICK_LINES, PICK_DIALOGS, PICK_MESSAGES });
    expect(copy).not.toMatch(/@|\{login\}|picked by|someone/i);
  });
});
