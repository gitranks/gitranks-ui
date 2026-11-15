import { describe, expect, it } from 'vitest';

import {
  ON_DAILY_DIALOG,
  PICK_DIALOGS,
  PICK_LABELS,
  PICK_LINES,
  PICK_LIST,
  PICK_MESSAGES,
  PICK_TOASTS,
  PICKS_MAX,
  pickedOutcomeOf,
  picksLeftText,
} from './pick-messages';
import { DAILY_UPDATES_NOTES, PULL_MESSAGES, PULL_TOASTS } from './pull-messages';
import {
  DAILY_UPDATES_LINES,
  fillTime,
  REFRESH_LABELS,
  REFRESH_MESSAGES,
  REFRESH_TOASTS,
  STAR_STEP_REFRESH,
  WELCOME_BACK,
} from '@/components/refresh-dialogs/refresh-messages';

describe('pick messages', () => {
  it('labels the button and its line as the design does', () => {
    expect(PICK_LABELS).toEqual({ updateDaily: 'Update daily', updatesDaily: 'Updates daily' });
    expect(PICK_LINES).toEqual({ off: 'Update up to 3 repos daily.', yourPick: 'You added it.' });
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
      primary: 'Done',
      secondary: 'Close',
    });
    expect(PICK_DIALOGS.allPicksUsed).toEqual({
      title: 'You update 3 repos daily',
      paragraph: 'Remove one to add this repo.',
      primary: 'Done',
      secondary: 'Cancel',
    });
  });

  it('says when another repo can be added', () => {
    expect(PICK_DIALOGS.dailyLimit.title).toBe('No more repos today');
    expect(fillTime(PICK_DIALOGS.dailyLimit.paragraph, '12 h')).toBe('You can add another repo in 12 h.');
  });

  it('counts the repos that can still be added in plain words', () => {
    expect(picksLeftText(1)).toBe('You can add 1 more repo.');
    expect(picksLeftText(2)).toBe('You can add 2 more repos.');
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

  it('never says "pick" or "free" to a visitor, in any daily updates or Refresh copy', () => {
    const copy = JSON.stringify([
      PICK_LABELS,
      PICK_LINES,
      PICK_DIALOGS,
      ON_DAILY_DIALOG,
      PICK_LIST,
      PICK_MESSAGES,
      PICK_TOASTS,
      [1, 2, 3].map(picksLeftText),
      PULL_MESSAGES,
      PULL_TOASTS,
      DAILY_UPDATES_NOTES,
      REFRESH_MESSAGES,
      STAR_STEP_REFRESH,
      REFRESH_LABELS,
      DAILY_UPDATES_LINES,
      REFRESH_TOASTS,
      WELCOME_BACK,
    ]);
    expect(copy).not.toMatch(/\bpick(s|ed)?\b/i);
    expect(copy).not.toMatch(/\bfree\b/i);
  });
});
