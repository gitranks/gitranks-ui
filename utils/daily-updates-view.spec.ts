import { describe, expect, it } from 'vitest';

import { type DailyUpdatesFacts, nextUpdateText, profileUpdatesViewOf, repoUpdatesViewOf } from './daily-updates-view';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { RefreshMode } from '@/utils/refresh-mode';

const { Owner, Badge, Pick } = DailyUpdateReason;
const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;

const facts = (...reasons: DailyUpdateReason[]): DailyUpdatesFacts => ({
  reasons,
  nextUpdateAt: new Date(NOW + 5 * HOUR).toISOString(),
});

describe('profileUpdatesViewOf', () => {
  const visitors: RefreshMode[] = ['signed-out', 'other', 'loading'];

  it.each(visitors)("shows today's button to a %s visitor while the profile is not on daily updates", (mode) => {
    expect(profileUpdatesViewOf(mode, null)).toBe('visitor-off');
    expect(profileUpdatesViewOf(mode, undefined)).toBe('visitor-off');
    expect(profileUpdatesViewOf(mode, facts())).toBe('visitor-off');
  });

  it.each(visitors)('names the owner or the badge to a %s visitor', (mode) => {
    expect(profileUpdatesViewOf(mode, facts(Owner))).toBe('visitor-on-owner');
    expect(profileUpdatesViewOf(mode, facts(Badge))).toBe('visitor-on-badge');
  });

  it('names the badge when both hold: it tells less about the owner', () => {
    expect(profileUpdatesViewOf('signed-out', facts(Owner, Badge))).toBe('visitor-on-badge');
    expect(profileUpdatesViewOf('other', facts(Badge, Owner))).toBe('visitor-on-badge');
  });

  it("keeps today's button for the owner and for a token user, who may refresh it", () => {
    for (const mode of ['daily', 'token'] as const) {
      expect(profileUpdatesViewOf(mode, facts(Owner))).toBe('visitor-off');
      expect(profileUpdatesViewOf(mode, facts(Badge))).toBe('visitor-off');
    }
  });

  it('ignores a pick: profiles are not picked', () => {
    expect(profileUpdatesViewOf('signed-out', facts(Pick))).toBe('visitor-off');
  });
});

describe('repoUpdatesViewOf', () => {
  it('shows nothing new while the repository is not on daily updates', () => {
    expect(repoUpdatesViewOf(null)).toBe('repo-off');
    expect(repoUpdatesViewOf(undefined)).toBe('repo-off');
    expect(repoUpdatesViewOf(facts())).toBe('repo-off');
  });

  it('names the badge, and the badge when both hold', () => {
    expect(repoUpdatesViewOf(facts(Badge))).toBe('repo-on-badge');
    expect(repoUpdatesViewOf(facts(Pick, Badge))).toBe('repo-on-badge');
  });

  it('says only that a picked repository updates daily', () => {
    expect(repoUpdatesViewOf(facts(Pick))).toBe('repo-on-pick');
  });
});

describe('nextUpdateText', () => {
  it('counts down by the clock it is given', () => {
    expect(nextUpdateText(new Date(NOW + 5 * HOUR).toISOString(), NOW)).toBe('Next update in 5 h.');
    expect(nextUpdateText(new Date(NOW + 23 * HOUR + 10 * 60_000).toISOString(), NOW)).toBe(
      'Next update in 23 h 10 min.',
    );
    expect(nextUpdateText(new Date(NOW + 20_000).toISOString(), NOW)).toBe('Next update in 1 min.');
  });

  it('says "soon" once it is due', () => {
    expect(nextUpdateText(new Date(NOW).toISOString(), NOW)).toBe('Next update soon.');
    expect(nextUpdateText(new Date(NOW - 3 * HOUR).toISOString(), NOW)).toBe('Next update soon.');
  });

  it('says nothing without a time', () => {
    expect(nextUpdateText(null, NOW)).toBeNull();
    expect(nextUpdateText(undefined, NOW)).toBeNull();
    expect(nextUpdateText('not a date', NOW)).toBeNull();
  });
});
