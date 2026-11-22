import { describe, expect, it } from 'vitest';

import { fillName, PICK_DIALOGS, PICK_LINES, pickCopyOf, pickedOutcomeOf } from './pick-messages';
import { fillTime, REFRESH_MESSAGES } from '@/components/refresh-dialogs/refresh-messages';

/** The lines that name what can be picked, by their place, `{name}` and `{time}` filled as the pages fill them. */
const words = (kind: 'repo' | 'package') => {
  const copy = pickCopyOf(kind);
  return {
    'PICK_LINES.off': copy.lines.off,
    'PICK_DIALOGS.allPicksUsed.title': copy.dialogs.allPicksUsed.title,
    'PICK_DIALOGS.allPicksUsed.paragraph': fillName(copy.dialogs.allPicksUsed.paragraph ?? '', 'left-pad'),
    'PICK_DIALOGS.dailyLimit.title': copy.dialogs.dailyLimit.title,
    'PICK_DIALOGS.dailyLimit.paragraph': fillTime(copy.dialogs.dailyLimit.paragraph ?? '', '9 h'),
    'ON_DAILY_DIALOG.title': copy.onDailyTitle,
    'PICK_TOASTS.notHeld': copy.toasts.notHeld,
    'PICK_TOASTS.removeFailed': copy.toasts.removeFailed,
    'PICK_TOASTS.pickedRefreshing': copy.toasts.pickedRefreshing,
    'PICK_TOASTS.pickedNoRefresh': copy.toasts.pickedNoRefresh,
  };
};

describe("the daily-updates copy, by the page's kind", () => {
  it('says repos or packages, and names a repository on its page', () => {
    expect(words('repo')).toEqual({
      'PICK_LINES.off': 'Update up to 3 repos or packages daily.',
      'PICK_DIALOGS.allPicksUsed.title': 'You update 3 repos and packages daily',
      'PICK_DIALOGS.allPicksUsed.paragraph': 'Repos and packages share these 3. Remove one to add left-pad.',
      'PICK_DIALOGS.dailyLimit.title': 'No more additions today',
      'PICK_DIALOGS.dailyLimit.paragraph': 'You can add another repo or package in 9 h.',
      'ON_DAILY_DIALOG.title': 'This repository updates every day',
      'PICK_TOASTS.notHeld': 'This repository can’t be updated daily right now.',
      'PICK_TOASTS.removeFailed': 'It was not removed. Please try again.',
      'PICK_TOASTS.pickedRefreshing': 'Refreshing now. This repository is on daily updates.',
      'PICK_TOASTS.pickedNoRefresh': 'This repository is on daily updates. Its first update comes soon.',
    });
    const copy = pickCopyOf('repo');
    expect(copy.lines).toBe(PICK_LINES);
    expect(copy.dialogs).toBe(PICK_DIALOGS);
  });

  it('names a package on its page', () => {
    const pkg = words('package');
    expect(pkg['ON_DAILY_DIALOG.title']).toBe('This package updates every day');
    expect(pkg['PICK_TOASTS.notHeld']).toBe('This package can’t be updated daily right now.');
    expect(pkg['PICK_TOASTS.pickedRefreshing']).toBe('Refreshing now. This package is on daily updates.');
    expect(pkg['PICK_TOASTS.pickedNoRefresh']).toBe('This package is on daily updates. Its first update comes soon.');
  });

  it('leaves no placeholder but {name} and {time} for the caller', () => {
    for (const kind of ['repo', 'package'] as const) {
      expect(JSON.stringify(pickCopyOf(kind))).not.toContain('{entity}');
    }
    expect(REFRESH_MESSAGES.deal.closing[1]).toBe('You can also update up to 3 repos or packages daily.');
  });

  it('says a pick’s refresh in the page’s words', () => {
    const { toasts } = pickCopyOf('package');
    expect(pickedOutcomeOf({ kind: 'poll' }, toasts)).toEqual({ kind: 'poll', toast: toasts.pickedRefreshing });
    expect(pickedOutcomeOf(null, toasts)).toEqual({ kind: 'toast', tone: 'success', text: toasts.pickedNoRefresh });
  });
});
