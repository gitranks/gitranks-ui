import { describe, expect, it } from 'vitest';

import { recentPullState, repoPullPath } from './repo-pull';
import type { RepoPullState } from '@/types/repo-pull.types';

const NOW = Date.parse('2026-10-26T10:00:00.000Z');

const pull = (status: RepoPullState['status'], finishedAt: string | null): RepoPullState => ({
  id: 'p1',
  status,
  requestedAt: '2026-10-26T09:50:00.000Z',
  finishedAt,
});

describe('repoPullPath', () => {
  it('fetches on the visitor’s own access only after a token sign-in', () => {
    expect(repoPullPath('token')).toBe('/repo/pull/token');
    expect(repoPullPath('identity')).toBe('/repo/pull/daily');
    expect(repoPullPath(undefined)).toBe('/repo/pull/daily');
  });
});

describe('recentPullState', () => {
  it('keys a fetch that finished lately by its status and end', () => {
    expect(recentPullState(pull('done', '2026-10-26T09:58:00.000Z'), NOW)).toBe('done@2026-10-26T09:58:00.000Z');
    expect(recentPullState(pull('failed', '2026-10-26T09:58:00.000Z'), NOW)).toBe('failed@2026-10-26T09:58:00.000Z');
  });

  it('still keys a slow fetch that finished up to two hours ago', () => {
    expect(recentPullState(pull('done', '2026-10-26T08:00:00.000Z'), NOW)).toBe('done@2026-10-26T08:00:00.000Z');
  });

  it('is null without a finished fetch, or for one that finished long ago', () => {
    expect(recentPullState(null, NOW)).toBeNull();
    expect(recentPullState(pull('running', null), NOW)).toBeNull();
    expect(recentPullState(pull('done', null), NOW)).toBeNull();
    expect(recentPullState(pull('done', 'garbage'), NOW)).toBeNull();
    expect(recentPullState(pull('done', '2026-10-26T07:59:59.000Z'), NOW)).toBeNull();
  });
});
