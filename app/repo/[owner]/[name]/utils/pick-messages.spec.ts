import { describe, expect, it } from 'vitest';

import {
  fillRepo,
  ON_DAILY_DIALOG,
  PICK_DIALOGS,
  PICK_LABELS,
  PICK_LINES,
  PICK_MESSAGES,
  PICK_TOASTS,
  PICKS_MAX,
  pickedOutcomeOf,
  picksLeftText,
} from './pick-messages';
import { fillTime, REFRESH_MESSAGES } from '@/components/refresh-dialogs/refresh-messages';

describe('pick messages', () => {
  it('labels the button and its line as the design does', () => {
    expect(PICK_LABELS).toEqual({ updateDaily: 'Update daily', updatesDaily: 'Updates daily' });
    expect(PICK_LINES).toEqual({ off: 'Update up to 3 repos daily.', yourPick: 'Your pick.' });
  });

  it('words the dialog of a repository on daily updates', () => {
    expect(ON_DAILY_DIALOG).toEqual({
      title: 'This repository updates every day',
      refresh: 'Refresh now',
      close: 'Close',
      done: 'OK',
    });
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
    expect(Object.keys(PICK_MESSAGES)).toEqual(['starStep', 'blocked']);
  });

  it('keeps the pick when the refresh after it is refused, and says its first update comes soon', () => {
    const stands = { kind: 'toast', tone: 'success', text: PICK_TOASTS.pickedNoRefresh };
    expect(PICK_TOASTS.pickedNoRefresh).toBe('This repository is on daily updates. Its first update comes soon.');
    expect(pickedOutcomeOf(null)).toEqual(stands);
    expect(pickedOutcomeOf({ kind: 'dialog', dialog: 'used', until: '2026-11-16T00:00:00Z' })).toEqual(stands);
    expect(pickedOutcomeOf({ kind: 'dialog', dialog: 'signIn' })).toEqual(stands);
    expect(pickedOutcomeOf({ kind: 'toast', tone: 'error', text: 'GitHub didn’t answer.' })).toEqual(stands);
  });

  it('says the pick with a refresh that runs, and reloads as always when one ended', () => {
    expect(pickedOutcomeOf({ kind: 'poll', toast: 'Fetching the star history now.' })).toEqual({
      kind: 'poll',
      toast: 'Refreshing now. This repository is on daily updates.',
    });
    expect(pickedOutcomeOf({ kind: 'poll' })).toEqual({ kind: 'poll', toast: PICK_TOASTS.pickedRefreshing });
    expect(pickedOutcomeOf({ kind: 'reload', note: 'Updated.' })).toEqual({ kind: 'reload', note: 'Updated.' });
  });

  it('never names anyone who picked a repository', () => {
    const copy = JSON.stringify({ PICK_LABELS, PICK_LINES, PICK_DIALOGS, ON_DAILY_DIALOG, PICK_MESSAGES, PICK_TOASTS });
    expect(copy).not.toMatch(/@|\{login\}|picked by|someone/i);
  });

  it('never calls an update free: none of them costs anything', () => {
    const copy = JSON.stringify({ PICK_LABELS, PICK_LINES, PICK_DIALOGS, ON_DAILY_DIALOG, PICK_TOASTS });
    expect(copy).not.toMatch(/\bfree\b/i);
  });
});
