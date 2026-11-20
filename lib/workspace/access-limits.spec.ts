import { describe, expect, it } from 'vitest';

import { capHintOf, capRefusalOf, capsOf, effectiveSettingOf, openPrsOverrideOf } from './access-limits';
import { attemptsSummaryOf, budgetSummaryOf, openPrsSummaryOf } from './settings-summary';
import { limits, settings } from '@/lib/contribute/__fixtures__/contribute-views';

describe('the access level on the settings', () => {
  it('caps nothing at the standard level, while suspended, or while the limits are not answered', () => {
    expect(capsOf(limits.standard)).toBeNull();
    expect(capsOf(limits.suspended)).toBeNull();
    expect(capsOf(undefined)).toBeNull();
    expect(effectiveSettingOf({ ...settings, attemptsAtATime: 3 }, limits.standard, 'attemptsAtATime')).toBe(3);
    expect(effectiveSettingOf({ ...settings, attemptsAtATime: 3 }, undefined, 'attemptsAtATime')).toBe(3);
    expect(capHintOf(limits.standard, 'attemptsAtATime')).toBeNull();
  });

  it('holds a setting to the cap below it, and keeps one already under it', () => {
    const stored = { ...settings, attemptsAtATime: 3, openPrsAtATime: 1 };
    expect(effectiveSettingOf(stored, limits.newAccount, 'attemptsAtATime')).toBe(1);
    expect(effectiveSettingOf(stored, limits.newAccount, 'openPrsAtATime')).toBe(1);
    expect(effectiveSettingOf(stored, limits.followThrough, 'openPrsAtATime')).toBe(1);
  });

  it('reads the open PR limit that holds from the API, and works it out as before when it is not answered', () => {
    const three = { ...settings, openPrsAtATime: 3 };
    expect(effectiveSettingOf(three, { ...limits.standard, openPrsEffective: 3 }, 'openPrsAtATime')).toBe(3);
    expect(effectiveSettingOf(three, { ...limits.newAccount, openPrsEffective: 2 }, 'openPrsAtATime')).toBe(2);
    // Not answered, or null: the setting under the reduced level's cap, as before.
    expect(effectiveSettingOf(three, limits.newAccount, 'openPrsAtATime')).toBe(2);
    expect(effectiveSettingOf(three, { ...limits.standard, openPrsEffective: null }, 'openPrsAtATime')).toBe(3);
    // Only the open PR limit: attempts at a time are worked out as before.
    expect(effectiveSettingOf(three, { ...limits.newAccount, openPrsEffective: 16 }, 'attemptsAtATime')).toBe(1);
  });

  it('holds a limit set for the account over the setting and the cap, with no hint for it', () => {
    const three = { ...settings, openPrsAtATime: 3 };
    expect(effectiveSettingOf(three, limits.openPrsSet, 'openPrsAtATime')).toBe(16);
    const reduced = { ...limits.newAccount, openPrsEffective: 16, openPrsOverride: 16 };
    expect(effectiveSettingOf(three, reduced, 'openPrsAtATime')).toBe(16);
    expect(capHintOf(reduced, 'openPrsAtATime')).toBeNull();
    expect(capRefusalOf(reduced, 'openPrsAtATime', 'Open PRs at a time', 5, 3)).toBeNull();
    // The attempts' cap still holds and is hinted.
    expect(capHintOf(reduced, 'attemptsAtATime')).toEqual({ max: 1, text: 'while your account is new' });
    expect(openPrsOverrideOf(reduced)).toBe(16);
    expect(openPrsOverrideOf(limits.newAccount)).toBeNull();
    expect(openPrsOverrideOf({ ...limits.newAccount, openPrsOverride: null })).toBeNull();
    expect(openPrsOverrideOf(undefined)).toBeNull();
  });

  it('says why the cap holds: while the account is new, else for now', () => {
    expect(capHintOf(limits.newAccount, 'attemptsAtATime')).toEqual({ max: 1, text: 'while your account is new' });
    expect(capHintOf(limits.followThrough, 'openPrsAtATime')).toEqual({ max: 2, text: 'for now' });
    // Suspended: nothing new starts, so no setting is capped and nothing is hinted.
    expect(capHintOf(limits.suspended, 'attemptsAtATime')).toBeNull();
    // Reduced by the owner, with no reason to name.
    expect(capHintOf({ ...limits.followThrough, reason: null }, 'attemptsAtATime')?.text).toBe('for now');
  });

  it('says the attempts and open pull requests that hold, with the cap only when it is below the setting', () => {
    const three = { ...settings, attemptsAtATime: 3 };
    expect(attemptsSummaryOf(three, limits.newAccount)).toBe('1 issue in work at once while your account is new');
    expect(attemptsSummaryOf(three, limits.followThrough)).toBe('1 issue in work at once for now');
    expect(attemptsSummaryOf(settings, limits.newAccount)).toBe('1 issue in work at once');
    expect(attemptsSummaryOf(three, limits.standard)).toBe('Up to 3 issues in work at once');
    expect(attemptsSummaryOf(three, limits.suspended)).toBe('Up to 3 issues in work at once');
    expect(openPrsSummaryOf(settings, limits.standard, 2)).toBe('Up to 3 · 2 open now');
    expect(openPrsSummaryOf({ ...settings, openPrsAtATime: 8 }, limits.followThrough)).toBe('Up to 2 for now');
    expect(budgetSummaryOf(three)).toBe('$200 a cycle · renews on the 14th · up to $5 an attempt');
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
