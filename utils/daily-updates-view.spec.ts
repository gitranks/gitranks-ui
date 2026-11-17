import { describe, expect, it } from 'vitest';

import {
  canPick,
  type DailyUpdatesFacts,
  isPickKind,
  nextUpdateText,
  pickableUpdatesViewOf,
  profileUpdatesViewOf,
  samePick,
  type ViewerFacts,
  withoutPickReason,
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
const repo = (name: string) => ({ kind: 'repo' as const, name });
const ROCKET = repo('octo/rocket');
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

describe('pickableUpdatesViewOf', () => {
  it('shows nothing new while the repository is not on daily updates', () => {
    expect(pickableUpdatesViewOf(null, null, ROCKET)).toBe('off');
    expect(pickableUpdatesViewOf(undefined, null, ROCKET)).toBe('off');
    expect(pickableUpdatesViewOf(facts(), null, ROCKET)).toBe('off');
  });

  it('names the badge, and the badge when both hold', () => {
    expect(pickableUpdatesViewOf(facts(Badge), null, ROCKET)).toBe('on-badge');
    expect(pickableUpdatesViewOf(facts(Pick, Badge), null, ROCKET)).toBe('on-badge');
  });

  it('says only that a picked repository updates daily', () => {
    expect(pickableUpdatesViewOf(facts(Pick), null, ROCKET)).toBe('on-pick');
  });

  const mine = viewer({ picks: [{ kind: 'repo', name: 'Octo/Rocket', pickedAt: '2026-11-15T10:00:00.000Z' }] });

  it("shows the visitor's own pick first, in any letter case, before it is on the page", () => {
    expect(pickableUpdatesViewOf(null, mine, ROCKET)).toBe('your-pick');
    expect(pickableUpdatesViewOf(facts(Pick, Badge), mine, repo('OCTO/ROCKET'))).toBe('your-pick');
  });

  it('shows the repository as anyone sees it when it is not their pick, or the API keeps daily updates closed', () => {
    expect(pickableUpdatesViewOf(facts(Pick), mine, repo('octo/lantern'))).toBe('on-pick');
    expect(pickableUpdatesViewOf(facts(Pick), { ...mine!, open: false }, ROCKET)).toBe('on-pick');
  });

  it('shows a pick held while the visitor’s daily updates are off as anyone sees the repository', () => {
    for (const state of ['lapsed', 'never'] as const) {
      const off = { ...mine!, state };
      expect(pickableUpdatesViewOf(facts(Pick), off, ROCKET)).toBe('on-pick');
      expect(pickableUpdatesViewOf(null, off, ROCKET)).toBe('off');
    }
  });
});

describe('canPick', () => {
  it('offers a pick on a repository not on daily updates, to a visitor the API lets pick', () => {
    expect(canPick('off', viewer({ state: 'never' }), ROCKET)).toBe(true);
  });

  it('offers nothing new signed out, before the read, while closed, or on a repository that updates daily', () => {
    expect(canPick('off', null, ROCKET)).toBe(false);
    expect(canPick('off', viewer({ open: false }), ROCKET)).toBe(false);
    for (const view of ['your-pick', 'on-badge', 'on-pick'] as const) {
      expect(canPick(view, viewer(), ROCKET)).toBe(false);
    }
  });

  it('offers no pick of a repository the visitor holds already, live or not: the press would change nothing', () => {
    const held = viewer({
      state: 'lapsed',
      picks: [{ kind: 'repo', name: 'Octo/Rocket', pickedAt: '2026-11-15T10:00:00Z' }],
    });
    expect(canPick('off', held, ROCKET)).toBe(false);
    expect(canPick('off', held, repo('octo/lantern'))).toBe(true);
  });
});

describe('samePick and isPickKind', () => {
  it('matches a repository by its kind and its name in any letter case', () => {
    expect(samePick(ROCKET, repo('Octo/ROCKET'))).toBe(true);
    expect(samePick(ROCKET, repo('octo/lantern'))).toBe(false);
  });

  it('knows the repository kind only', () => {
    expect(isPickKind('repo')).toBe(true);
    for (const kind of ['user', 'Repo', '', null, undefined, 1]) {
      expect(isPickKind(kind)).toBe(false);
    }
  });
});

describe('withoutPickReason', () => {
  it('drops the pick reason only', () => {
    expect(withoutPickReason(facts(Pick, Badge))?.reasons).toEqual([Badge]);
    expect(withoutPickReason(null)).toBeNull();
    expect(withoutPickReason(undefined)).toBeUndefined();
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
