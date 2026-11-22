import { describe, expect, it } from 'vitest';

import {
  fillName,
  ON_DAILY_DIALOG,
  PICK_DIALOGS,
  PICK_LINES,
  PICK_LIST,
  PICK_TOASTS,
  pickCopyOf,
  pickedOutcomeOf,
  picksLeftText,
} from './pick-messages';
import { fillTime, REFRESH_MESSAGES } from '@/components/refresh-dialogs/refresh-messages';

/** The 12 lines that say "repos" on the older repository page and "repos or packages" elsewhere, by their place. */
const switched = (packages: boolean, kind: 'repo' | 'package' = 'repo') => {
  const copy = pickCopyOf(packages, kind);
  return {
    'PICK_LINES.off': copy.lines.off,
    'PICK_DIALOGS.allPicksUsed.title': copy.dialogs.allPicksUsed.title,
    'PICK_DIALOGS.allPicksUsed.paragraph': fillName(copy.dialogs.allPicksUsed.paragraph ?? '', 'left-pad'),
    'PICK_DIALOGS.dailyLimit.title': copy.dialogs.dailyLimit.title,
    'PICK_DIALOGS.dailyLimit.paragraph': fillTime(copy.dialogs.dailyLimit.paragraph ?? '', '9 h'),
    'ON_DAILY_DIALOG.title': copy.onDailyTitle,
    picksLeftText: [copy.list.left(1), copy.list.left(2)],
    PICK_LIST: copy.list.kinds ?? null,
    'PICK_TOASTS.notHeld': copy.toasts.notHeld,
    'PICK_TOASTS.removeFailed': copy.toasts.removeFailed,
    'PICK_TOASTS.pickedRefreshing': copy.toasts.pickedRefreshing,
    'PICK_TOASTS.pickedNoRefresh': copy.toasts.pickedNoRefresh,
  };
};

describe('the flag-switched daily-updates copy', () => {
  it("keeps today's words while packages are not shown", () => {
    expect(switched(false)).toEqual({
      'PICK_LINES.off': 'Update up to 3 repos daily.',
      'PICK_DIALOGS.allPicksUsed.title': 'You update 3 repos daily',
      'PICK_DIALOGS.allPicksUsed.paragraph': 'Remove one to add this repo.',
      'PICK_DIALOGS.dailyLimit.title': 'No more repos today',
      'PICK_DIALOGS.dailyLimit.paragraph': 'You can add another repo in 9 h.',
      'ON_DAILY_DIALOG.title': 'This repository updates every day',
      picksLeftText: ['You can add 1 more repo.', 'You can add 2 more repos.'],
      PICK_LIST: null,
      'PICK_TOASTS.notHeld': 'This repository can’t be updated daily right now.',
      'PICK_TOASTS.removeFailed': 'The repo was not removed. Please try again.',
      'PICK_TOASTS.pickedRefreshing': 'Refreshing now. This repository is on daily updates.',
      'PICK_TOASTS.pickedNoRefresh': 'This repository is on daily updates. Its first update comes soon.',
    });
    // Today's words are the constants the pages used before, unchanged.
    const today = pickCopyOf(false, 'package');
    expect(today.lines).toBe(PICK_LINES);
    expect(today.dialogs).toBe(PICK_DIALOGS);
    expect(today.onDailyTitle).toBe(ON_DAILY_DIALOG.title);
    expect(today.toasts).toBe(PICK_TOASTS);
    expect(today.list).toEqual({ ...PICK_LIST, left: picksLeftText });
  });

  it('says repos or packages once packages are shown, by the page’s kind', () => {
    expect(switched(true, 'repo')).toEqual({
      'PICK_LINES.off': 'Update up to 3 repos or packages daily.',
      'PICK_DIALOGS.allPicksUsed.title': 'You update 3 repos and packages daily',
      'PICK_DIALOGS.allPicksUsed.paragraph': 'Repos and packages share these 3. Remove one to add left-pad.',
      'PICK_DIALOGS.dailyLimit.title': 'No more additions today',
      'PICK_DIALOGS.dailyLimit.paragraph': 'You can add another repo or package in 9 h.',
      'ON_DAILY_DIALOG.title': 'This repository updates every day',
      picksLeftText: ['You can add 1 more repo or package.', 'You can add 2 more repos or packages.'],
      PICK_LIST: { repo: 'Repository', package: 'npm package' },
      'PICK_TOASTS.notHeld': 'This repository can’t be updated daily right now.',
      'PICK_TOASTS.removeFailed': 'It was not removed. Please try again.',
      'PICK_TOASTS.pickedRefreshing': 'Refreshing now. This repository is on daily updates.',
      'PICK_TOASTS.pickedNoRefresh': 'This repository is on daily updates. Its first update comes soon.',
    });

    const pkg = switched(true, 'package');
    expect(pkg['ON_DAILY_DIALOG.title']).toBe('This package updates every day');
    expect(pkg['PICK_TOASTS.notHeld']).toBe('This package can’t be updated daily right now.');
    expect(pkg['PICK_TOASTS.pickedRefreshing']).toBe('Refreshing now. This package is on daily updates.');
    expect(pkg['PICK_TOASTS.pickedNoRefresh']).toBe('This package is on daily updates. Its first update comes soon.');
  });

  it('leaves no placeholder but {name} and {time} for the caller', () => {
    const words = JSON.stringify(pickCopyOf(true, 'package'));
    expect(words).not.toContain('{entity}');
    expect(REFRESH_MESSAGES.deal.closing[1]).toBe('You can also update up to 3 repos or packages daily.');
  });

  it('says a pick’s refresh in the page’s words', () => {
    const { toasts } = pickCopyOf(true, 'package');
    expect(pickedOutcomeOf({ kind: 'poll' }, toasts)).toEqual({ kind: 'poll', toast: toasts.pickedRefreshing });
    expect(pickedOutcomeOf(null, toasts)).toEqual({ kind: 'toast', tone: 'success', text: toasts.pickedNoRefresh });
  });
});
