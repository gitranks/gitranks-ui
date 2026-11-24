import { describe, expect, it } from 'vitest';

import { effectiveSettingOf, openPrsOverrideOf } from './access-limits';
import { attemptsSummaryOf, budgetSummaryOf, openPrsSummaryOf } from './settings-summary';
import { limits, settings } from '@/lib/contribute/__fixtures__/contribute-views';

describe('the access level on the settings', () => {
  it('holds the setting as set at the standard level, while suspended, or while the limits are not answered', () => {
    const three = { ...settings, attemptsAtATime: 3 };
    expect(effectiveSettingOf(three, limits.standard, 'attemptsAtATime')).toBe(3);
    expect(effectiveSettingOf(three, limits.suspended, 'attemptsAtATime')).toBe(3);
    expect(effectiveSettingOf(three, undefined, 'attemptsAtATime')).toBe(3);
  });

  it('reads the open PR limit that holds from the API, and holds the setting when it is not answered', () => {
    const three = { ...settings, openPrsAtATime: 3 };
    expect(effectiveSettingOf(three, { ...limits.standard, openPrsEffective: 2 }, 'openPrsAtATime')).toBe(2);
    expect(effectiveSettingOf(three, limits.standard, 'openPrsAtATime')).toBe(3);
    expect(effectiveSettingOf(three, { ...limits.standard, openPrsEffective: null }, 'openPrsAtATime')).toBe(3);
    // Only the open PR limit: attempts at a time are the setting.
    expect(effectiveSettingOf(three, { ...limits.standard, openPrsEffective: 16 }, 'attemptsAtATime')).toBe(1);
  });

  it('holds a limit set for the account over the setting', () => {
    const three = { ...settings, openPrsAtATime: 3 };
    expect(effectiveSettingOf(three, limits.openPrsSet, 'openPrsAtATime')).toBe(16);
    expect(openPrsOverrideOf(limits.openPrsSet)).toBe(16);
    expect(openPrsOverrideOf(limits.standard)).toBeNull();
    expect(openPrsOverrideOf({ ...limits.standard, openPrsOverride: null })).toBeNull();
    expect(openPrsOverrideOf(undefined)).toBeNull();
  });

  it('says the attempts and open pull requests that hold', () => {
    const three = { ...settings, attemptsAtATime: 3 };
    expect(attemptsSummaryOf({ ...settings, attemptsAtATime: 1 }, limits.standard)).toBe('1 issue in work at once');
    expect(attemptsSummaryOf(three, limits.standard)).toBe('Up to 3 issues in work at once');
    expect(attemptsSummaryOf(three, limits.suspended)).toBe('Up to 3 issues in work at once');
    expect(openPrsSummaryOf(settings, limits.standard, 2)).toBe('Up to 3 · 2 open now');
    expect(openPrsSummaryOf(settings, limits.openPrsSet)).toBe('Up to 16');
    // None open: no zero count.
    expect(openPrsSummaryOf(settings, limits.standard, 0)).toBe('Up to 3');
    expect(budgetSummaryOf(three)).toBe('$200 a cycle · renews on the 14th · up to $5 a run');
  });
});
