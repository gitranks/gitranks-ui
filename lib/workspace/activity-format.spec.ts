import { describe, expect, it } from 'vitest';

import {
  activitySignatureOf,
  activityTabsOf,
  etaOf,
  itemsOn,
  labelOf,
  shareOf,
  summaryOf,
  WAIT_TEXT,
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
    // The Contribute tab holds the issues too: their progress shows there.
    expect(activityTabsOf('/contribute')).toEqual(['OVERVIEW', 'ISSUES']);
    expect(activityTabsOf('/contribute/')).toEqual(['OVERVIEW', 'ISSUES']);
    expect(activityTabsOf('/my/settings')).toEqual(['SETTINGS']);
    expect(activityTabsOf('/my/settings/work/switch/stack')).toEqual(['SETTINGS']);
    expect(activityTabsOf('/my/settingsx')).toEqual([]);
    expect(activityTabsOf('/my/pull-requests')).toEqual([]);
    expect(activityTabsOf('/my/agent/connect')).toEqual([]);
    // The list's progress, on the Contribute tab: once, whichever of its tabs names it.
    const tab = activityTabsOf('/contribute');
    expect(
      itemsOn({ items: [item(), item({ tabs: ['OVERVIEW', 'ISSUES'] })], runs: [], readAt: '' }, tab),
    ).toHaveLength(2);
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

  it('words reads held by a pause by the key, never by a Resume that is gone', () => {
    const held = item({ kind: 'READS_PAUSED', label: 'Reading 2 repos starts when you resume', done: null });
    const two = { ...held, repos: [...held.repos, { ...held.repos[0], repositoryId: 'R_2' }] };
    expect(labelOf(two)).toBe('Reading 2 repos starts when your Claude key works again');
    expect(labelOf(held)).toBe('Reading 1 repo starts when your Claude key works again');
    expect(summaryOf([held, item()])).toBe('Reading 1 repo starts when your Claude key works again · 1 more');
    expect(WAIT_TEXT.READS_PAUSED).not.toMatch(/resume/i);
    expect(labelOf(item())).toBe('Reading issues from 2 of 3 repos');
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
