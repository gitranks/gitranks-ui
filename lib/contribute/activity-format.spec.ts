import { describe, expect, it } from 'vitest';

import {
  activityDelayOf,
  activitySignatureOf,
  activityTabOf,
  etaOf,
  itemsOn,
  shareOf,
  summaryOf,
} from './activity-format';
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
    expect(itemsOn({ items: [item()], readAt: '' }, 'OVERVIEW')).toEqual([]);
    expect(itemsOn({ items: [item()], readAt: '' }, null)).toEqual([]);
    expect(itemsOn(null, 'ISSUES')).toEqual([]);
  });

  it('reads again soon, backs off to a minute, and rarely while everything only waits', () => {
    const running = [item()];
    expect([0, 1, 2, 3, 4, 9].map((reads) => activityDelayOf(reads, running))).toEqual([
      5_000, 10_000, 20_000, 30_000, 60_000, 60_000,
    ]);
    expect(activityDelayOf(0, [item({ kind: 'FIRST_READS_WAITING' }), item({ kind: 'READS_PAUSED' })])).toBe(300_000);
    expect(activityDelayOf(0, [item({ kind: 'FIRST_READS_WAITING' }), item()])).toBe(5_000);
  });

  it('moves when an item ends or a repo moves on, not otherwise', () => {
    const before = activitySignatureOf({ items: [item()], readAt: 'a' });
    expect(activitySignatureOf({ items: [item()], readAt: 'b' })).toBe(before);
    expect(
      activitySignatureOf({
        items: [item({ repos: [{ repositoryId: 'R_1', nameWithOwner: 'a/b', stage: 'READING' }] })],
        readAt: 'b',
      }),
    ).not.toBe(before);
    expect(activitySignatureOf({ items: [], readAt: 'c' })).toBe('');
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
