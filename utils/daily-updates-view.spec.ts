import { describe, expect, it } from 'vitest';

import {
  canPickRepo,
  type DailyUpdatesFacts,
  nextUpdateText,
  profileUpdatesViewOf,
  repoUpdatesViewOf,
  type ViewerFacts,
} from './daily-updates-view';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { RefreshMode } from '@/utils/refresh-mode';

const { Owner, Badge, Pick } = DailyUpdateReason;
const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;

const facts = (...reasons: DailyUpdateReason[]): DailyUpdatesFacts => ({
  reasons,
  nextUpdateAt: new Date(NOW + 5 * HOUR).toISOString(),
});

const viewer = (overrides: Partial<NonNullable<ViewerFacts>> = {}): ViewerFacts => ({
  open: true,
  state: 'on',
  manual: { available: true, nextAt: null },
  picks: [],
  ...overrides,
});
const USED = { available: false, nextAt: new Date(NOW + 23 * HOUR).toISOString() };

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

describe("profileUpdatesViewOf, the owner's states", () => {
  it('offers the start while their daily updates are off', () => {
    expect(profileUpdatesViewOf('daily', null, viewer({ state: 'never' }))).toBe('owner-off');
    expect(profileUpdatesViewOf('daily', facts(Owner), viewer({ state: 'lapsed' }))).toBe('owner-off');
  });

  it('offers "Refresh now" while on, and nothing to press for once the manual refresh is used', () => {
    expect(profileUpdatesViewOf('daily', facts(Owner), viewer())).toBe('owner-on');
    expect(profileUpdatesViewOf('daily', facts(Owner), viewer({ manual: USED }))).toBe('owner-manual-used');
  });

  it('says the badge keeps it on when their own daily updates are not on', () => {
    expect(profileUpdatesViewOf('daily', facts(Badge), viewer({ state: 'never' }))).toBe('owner-on-badge-only');
    expect(profileUpdatesViewOf('daily', facts(Badge, Owner), viewer({ state: 'lapsed' }))).toBe('owner-on-badge-only');
  });

  it('prefers their own daily updates to the badge: they come with the manual refresh', () => {
    expect(profileUpdatesViewOf('daily', facts(Badge), viewer())).toBe('owner-on');
  });

  it("keeps today's button until the viewer is read, and while the API keeps daily updates closed to them", () => {
    expect(profileUpdatesViewOf('daily', facts(Owner), null)).toBe('visitor-off');
    expect(profileUpdatesViewOf('daily', facts(Badge), viewer({ open: false, state: 'never' }))).toBe('visitor-off');
  });

  it("shows no owner state on anyone else's profile, nor to a token user", () => {
    for (const mode of ['other', 'signed-out', 'loading'] as const) {
      expect(profileUpdatesViewOf(mode, facts(Owner), viewer())).toBe('visitor-on-owner');
      expect(profileUpdatesViewOf(mode, null, viewer())).toBe('visitor-off');
    }
    expect(profileUpdatesViewOf('token', facts(Owner), viewer())).toBe('visitor-off');
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

  const mine = viewer({ picks: [{ nameWithOwner: 'Octo/Rocket', pickedAt: '2026-11-15T10:00:00.000Z' }] });

  it("shows the visitor's own pick first, in any letter case, before it is on the page", () => {
    expect(repoUpdatesViewOf(null, mine, 'octo/rocket')).toBe('repo-your-pick');
    expect(repoUpdatesViewOf(facts(Pick, Badge), mine, 'OCTO/ROCKET')).toBe('repo-your-pick');
  });

  it('shows the repository as anyone sees it when it is not their pick, or the API keeps daily updates closed', () => {
    expect(repoUpdatesViewOf(facts(Pick), mine, 'octo/lantern')).toBe('repo-on-pick');
    expect(repoUpdatesViewOf(facts(Pick), { ...mine!, open: false }, 'octo/rocket')).toBe('repo-on-pick');
  });
});

describe('canPickRepo', () => {
  it('offers a pick on a repository not on daily updates, to a visitor the API lets pick', () => {
    expect(canPickRepo('repo-off', viewer({ state: 'never' }))).toBe(true);
  });

  it('offers nothing new signed out, before the read, while closed, or on a repository that updates daily', () => {
    expect(canPickRepo('repo-off', null)).toBe(false);
    expect(canPickRepo('repo-off', viewer({ open: false }))).toBe(false);
    for (const view of ['repo-your-pick', 'repo-on-badge', 'repo-on-pick'] as const) {
      expect(canPickRepo(view, viewer())).toBe(false);
    }
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
