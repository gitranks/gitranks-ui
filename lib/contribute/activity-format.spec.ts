import { describe, expect, it } from 'vitest';

import { activitySignatureOf, activityTabOf, etaOf, itemsOn, shareOf, summaryOf } from './activity-format';
import type { ContributeActivityItem } from './contribute.types';

const item = (over: Partial<ContributeActivityItem> = {}): ContributeActivityItem => ({
  kind: 'FIRST_READS',
  tabs: ['ISSUES', 'SETTINGS'],
  label: 'Reading issues from 2 of 3 repos',
  done: 1,
  total: 3,
  startedAt: '2026-10-31T12:00:00.000Z',
  expectedAt: '2026-10-31T13:10:00.000Z',
  repos: [{ repositoryId: 'R_1', nameWithOwner: 'a/b', stage: 'QUEUED' }],
  ...over,
});

describe('the activity, as the bar reads it', () => {
  it('belongs to the overview, issues and settings tabs', () => {
    expect(activityTabOf('/contribute')).toBe('OVERVIEW');
    expect(activityTabOf('/contribute/connect/')).toBe('OVERVIEW');
    expect(activityTabOf('/contribute/issues')).toBe('ISSUES');
    expect(activityTabOf('/contribute/settings')).toBe('SETTINGS');
    expect(activityTabOf('/contribute/settings/switch/stack')).toBe('SETTINGS');
    expect(activityTabOf('/contribute/settingsx')).toBeNull();
    expect(activityTabOf('/contribute/me')).toBeNull();
    expect(itemsOn({ items: [item()], runs: [], readAt: '' }, 'OVERVIEW')).toEqual([]);
    expect(itemsOn({ items: [item()], runs: [], readAt: '' }, null)).toEqual([]);
    expect(itemsOn(null, 'ISSUES')).toEqual([]);
  });

  it('moves when an item ends or a repo moves on, not otherwise', () => {
    const before = activitySignatureOf({ items: [item()], runs: [], readAt: 'a' });
    expect(activitySignatureOf({ items: [item()], runs: [], readAt: 'b' })).toBe(before);
    expect(
      activitySignatureOf({
        items: [item({ repos: [{ repositoryId: 'R_1', nameWithOwner: 'a/b', stage: 'READING' }] })],
        runs: [],
        readAt: 'b',
      }),
    ).not.toBe(before);
    expect(activitySignatureOf({ items: [], runs: [], readAt: 'c' })).toBe('');
    expect(activitySignatureOf(null)).toBe('');
  });

  it('says the first line, how many more, an estimate and a share', () => {
    expect(summaryOf([item(), item({ kind: 'STACK_RESOLVE' })])).toBe('Reading issues from 2 of 3 repos · 1 more');
    expect(summaryOf([])).toBe('');
    const now = new Date('2026-10-31T12:04:00.000Z');
    expect(etaOf('2026-10-31T12:05:00.000Z', now)).toBe('any moment now');
    expect(etaOf('2026-10-31T12:00:00.000Z', now)).toBe('any moment now');
    expect(etaOf('2026-10-31T12:20:00.000Z', now)).toBe('about 16 min');
    expect(etaOf('2026-10-31T14:30:00.000Z', now)).toBe('about 2 h');
    expect(etaOf(null, now)).toBeNull();
    expect(shareOf({ done: 1, total: 4 })).toBe(0.25);
    expect(shareOf({ done: null, total: null })).toBeNull();
    expect(shareOf({ done: 0, total: 0 })).toBeNull();
  });
});
