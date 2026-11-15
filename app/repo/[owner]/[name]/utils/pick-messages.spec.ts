import { describe, expect, it } from 'vitest';

import {
  fillRepo,
  PICK_DIALOGS,
  PICK_LABELS,
  PICK_LINES,
  PICK_MESSAGES,
  PICKS_MAX,
  picksDealOf,
  picksLeftText,
} from './pick-messages';
import { fillTime, REFRESH_MESSAGES } from '@/components/refresh-dialogs/refresh-messages';

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

  it('asks for the star with the profile’s own star step', () => {
    expect(PICK_MESSAGES.starStep).toBe(REFRESH_MESSAGES.starStep);
    expect(Object.keys(PICK_MESSAGES)).toEqual(['picksDeal', 'starStep', 'blocked']);
  });

  it('offers the deal signed out in the words of the design, its badge link for this repository', () => {
    expect(picksDealOf('brightfern/tidepool')).toEqual({
      photo: true,
      title: 'Hi, I’m Vitalii 👋',
      paragraphs: [
        'I made GitRanks. Bots press these buttons a lot, and our GitHub limits are small. So here is the deal:',
      ],
      steps: ['Sign in with GitHub. We only see your name and email.', 'Star our repo.'],
      closing: ['Then you pick 3 repositories. We update them, and your profile, every day.'],
      note: 'Is this your repository? Add a GitRanks badge to its README. While the badge is there, we update it every day. No sign-in needed.',
      noteLinks: [{ text: 'GitRanks badge', href: '/badge/builder?repo=brightfern/tidepool' }],
      primary: 'Sign in with GitHub',
      secondary: 'Maybe later',
    });
  });

  it('never names anyone who picked a repository', () => {
    const copy = JSON.stringify({ PICK_LABELS, PICK_LINES, PICK_DIALOGS, PICK_MESSAGES });
    expect(copy).not.toMatch(/@|\{login\}|picked by|someone/i);
  });
});
