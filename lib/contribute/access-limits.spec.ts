import { describe, expect, it } from 'vitest';

import { limits, settings } from './__fixtures__/contribute-views';
import { attemptsCapNoteOf, capHintOf, capRefusalOf, capsOf, effectiveSettingOf } from './access-limits';
import { budgetSummaryOf } from './settings-summary';

describe('the access level on the settings', () => {
  it('caps nothing at the standard level, or while the limits are not answered', () => {
    expect(capsOf(limits.standard)).toBeNull();
    expect(capsOf(undefined)).toBeNull();
    expect(effectiveSettingOf({ ...settings, attemptsAtATime: 3 }, limits.standard, 'attemptsAtATime')).toBe(3);
    expect(effectiveSettingOf({ ...settings, attemptsAtATime: 3 }, undefined, 'attemptsAtATime')).toBe(3);
    expect(capHintOf(limits.standard, 'attemptsAtATime')).toBeNull();
  });

  it('holds a setting to the cap below it, and keeps one already under it', () => {
    const stored = { ...settings, attemptsAtATime: 3, openPrsAtATime: 1 };
    expect(effectiveSettingOf(stored, limits.newAccount, 'attemptsAtATime')).toBe(1);
    expect(effectiveSettingOf(stored, limits.newAccount, 'openPrsAtATime')).toBe(1);
    expect(effectiveSettingOf(stored, limits.suspended, 'openPrsAtATime')).toBe(1);
  });

  it('says why the cap holds: while the account is new, else for now', () => {
    expect(capHintOf(limits.newAccount, 'attemptsAtATime')).toEqual({ max: 1, text: 'while your account is new' });
    expect(capHintOf(limits.followThrough, 'openPrsAtATime')).toEqual({ max: 2, text: 'for now' });
    expect(capHintOf(limits.suspended, 'attemptsAtATime')).toEqual({ max: 1, text: 'for now' });
    // Reduced by the owner, with no reason to name.
    expect(capHintOf({ ...limits.followThrough, reason: null }, 'attemptsAtATime')?.text).toBe('for now');
  });

  it('adds the attempts the cap holds to the budget line only when they are below the setting', () => {
    const three = { ...settings, attemptsAtATime: 3 };
    expect(attemptsCapNoteOf(three, limits.newAccount)).toBe('1 at a time (new-account limit)');
    expect(attemptsCapNoteOf(three, limits.followThrough)).toBe('1 at a time (limit for now)');
    expect(attemptsCapNoteOf(settings, limits.newAccount)).toBeNull();
    expect(attemptsCapNoteOf(three, limits.standard)).toBeNull();

    expect(budgetSummaryOf(three, limits.newAccount)).toBe(
      '$200 a cycle · Even, then a final sweep · renews on the 14th · 1 at a time (new-account limit)',
    );
    expect(budgetSummaryOf(three)).toBe('$200 a cycle · Even, then a final sweep · renews on the 14th');
  });

  it('refuses a value typed above the cap, and keeps the stored one for when the limit lifts', () => {
    expect(capRefusalOf(limits.newAccount, 'attemptsAtATime', 'Attempts at a time', 2, 1)).toBe(
      'Attempts at a time: up to 1 while your account is new.',
    );
    expect(capRefusalOf(limits.followThrough, 'openPrsAtATime', 'Open PRs at a time', 5, 3)).toBe(
      'Open PRs at a time: up to 2 for now.',
    );
    expect(capRefusalOf(limits.newAccount, 'attemptsAtATime', 'Attempts at a time', 1, 3)).toBeNull();
    expect(capRefusalOf(limits.newAccount, 'attemptsAtATime', 'Attempts at a time', 3, 3)).toBeNull();
    expect(capRefusalOf(limits.standard, 'attemptsAtATime', 'Attempts at a time', 3, 1)).toBeNull();
  });
});
