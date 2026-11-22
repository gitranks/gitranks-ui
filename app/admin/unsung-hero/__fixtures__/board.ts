import type { HeroBoard, HeroCandidate, HeroLiveCheck, HeroMail, HeroSlot } from '../admin.types';

// A board as the API answers it on Wednesday, October 28, 2026 at 12:00 UTC: week 44 is live, week 45 closes tonight.

export const BOARD_NOW = new Date('2026-10-28T12:00:00.000Z');

const mailOf = (overrides: Partial<HeroMail> = {}): HeroMail => ({
  queuedAt: '2026-10-21T23:10:00.000Z',
  sentAt: '2026-10-21T23:11:00.000Z',
  held: false,
  markedBy: null,
  noReceipt: false,
  ...overrides,
});

const weekOf = (week: number) => {
  const startsAt = new Date(Date.UTC(2026, 9, 26) + (week - 44) * 7 * 86_400_000);
  return {
    week: `2026-W${week}`,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 7 * 86_400_000).toISOString(),
  };
};

export function slotOf(overrides: Partial<HeroSlot> = {}): HeroSlot {
  return {
    id: '6721a0f0c0ffee0000000001',
    ...weekOf(44),
    status: 'LIVE',
    preview: false,
    repo: {
      githubId: '161403371',
      nameWithOwner: 'mona/scroll-guard',
      description: 'Keeps the page behind a dialog still',
      createdAt: '2019-01-14T10:00:00.000Z',
    },
    package: { registry: 'NPM', name: 'scroll-guard' },
    maintainer: { githubId: '582410', login: 'mona', name: 'Mona Lisa Octocat', hasEmail: true },
    line: 'Ships inside @example/dialog',
    reason: 'inside @example/dialog',
    text: 'Stops the page behind a dialog from scrolling. It ships inside @example/dialog, so it is probably in your app too.',
    noHeadsUp: false,
    facts: { weeklyDownloads: 98_800_000, dependents: 4_120, contributors: 41 },
    headsUp: mailOf(),
    recap: null,
    starsAtStart: 942,
    starsNow: 1_011,
    starsGained: null,
    visits: 1_204,
    githubClicks: 356,
    scheduledBy: 'octocat',
    scheduledAt: '2026-10-19T09:00:00.000Z',
    optedOutAt: null,
    cancelledReason: null,
    ...overrides,
  };
}

export function liveCheckOf(overrides: Partial<HeroLiveCheck> = {}): HeroLiveCheck {
  return {
    at: '2026-10-28T11:55:00.000Z',
    outcome: 'FOUND',
    package: { registry: 'NPM', name: 'ref-hook' },
    nameWithOwner: 'mona/ref-hook',
    githubStars: 312,
    isFork: false,
    isArchived: false,
    licenseSpdx: 'MIT',
    pushedAt: '2024-12-02T10:00:00.000Z',
    ownerLogin: 'mona',
    ownerType: 'User',
    ownerFollowers: 747,
    firstName: 'Mona',
    hasEmail: true,
    advisories: [],
    advisoriesIncomplete: false,
    lookupAnswered: true,
    linked: true,
    weeklyDownloads: 93_000_000,
    dependents: 2_310,
    optedOut: false,
    misses: [{ code: 'FOLLOWERS', label: 'Owner: 747 followers (over 500)', blocks: false }],
    refusals: [],
    refusalsWithoutHeadsUp: [],
    ...overrides,
  };
}

export function candidateOf(overrides: Partial<HeroCandidate> = {}): HeroCandidate {
  return {
    position: 1,
    repo: { githubId: '92718271', nameWithOwner: 'hubot/size-watch', createdAt: null },
    package: { registry: 'NPM', name: 'size-watch' },
    weeklyDownloads: 19_000_000,
    downloadsRank: 310,
    dependents: null,
    stars: 1_745,
    pushedAt: '2023-01-10T10:00:00.000Z',
    owner: { githubId: '7934134', login: 'hubot', type: 'User', followers: 31, hasEmail: false },
    score: 10_888,
    misses: [
      { code: 'STARS', label: '1,745 stars (over 1,000)', blocks: false },
      { code: 'STALE', label: 'No push since Jan 2023', blocks: false },
      { code: 'NO_EMAIL', label: 'No public email', blocks: true },
    ],
    liveCheck: null,
    ...overrides,
  };
}

/** A candidate checked a few minutes ago, nothing stopping Schedule. */
export const CHECKED = candidateOf({
  position: 2,
  repo: { githubId: '149283910', nameWithOwner: 'mona/ref-hook', createdAt: null },
  package: { registry: 'NPM', name: 'ref-hook' },
  weeklyDownloads: 93_000_000,
  stars: 309,
  pushedAt: '2024-12-02T10:00:00.000Z',
  owner: { githubId: '582410', login: 'mona', type: 'User', followers: 747, hasEmail: true },
  misses: [{ code: 'FOLLOWERS', label: 'Owner: 747 followers (over 500)', blocks: false }],
  liveCheck: liveCheckOf({ firstName: null }),
});

/** Week 45: its heads-up was queued 6+ hours ago and no receipt came. Locked, and may be marked as sent. */
export const NO_RECEIPT = slotOf({
  id: '6721a0f0c0ffee0000000002',
  ...weekOf(45),
  status: 'SCHEDULED',
  repo: { githubId: '72339221', nameWithOwner: 'octo-dev/static-copy', createdAt: null },
  package: { registry: 'NPM', name: 'static-copy' },
  headsUp: mailOf({ queuedAt: '2026-10-28T05:10:00.000Z', sentAt: null, noReceipt: true }),
  starsAtStart: null,
  starsNow: null,
});

/** Week 46: scheduled, its heads-up not sent yet. Cancellable. */
export const NOT_TOLD = slotOf({
  id: '6721a0f0c0ffee0000000003',
  ...weekOf(46),
  status: 'SCHEDULED',
  repo: { githubId: '89012345', nameWithOwner: 'mona/hide-rest', createdAt: null },
  package: { registry: 'NPM', name: 'hide-rest' },
  headsUp: null,
  starsAtStart: null,
  starsNow: null,
});

/** Week 47: the heads-up was held by the mailbox. Still cancellable: it did not leave. */
export const HELD = slotOf({
  id: '6721a0f0c0ffee0000000004',
  ...weekOf(47),
  status: 'SCHEDULED',
  repo: { githubId: '89012346', nameWithOwner: 'mona/side-load', createdAt: null },
  package: { registry: 'NPM', name: 'side-load' },
  headsUp: mailOf({ queuedAt: '2026-10-28T11:10:00.000Z', sentAt: null, held: true }),
  starsAtStart: null,
  starsNow: null,
});

/** The live hero: the maintainer was told, so the slot is locked. */
export const LIVE = slotOf();

export const PAST: HeroSlot[] = [
  slotOf({
    id: '6721a0f0c0ffee0000000010',
    ...weekOf(43),
    status: 'DONE',
    repo: { githubId: '33221100', nameWithOwner: 'octo-dev/number-check', createdAt: null },
    package: { registry: 'NPM', name: 'number-check' },
    starsAtStart: 290,
    starsNow: 318,
    starsGained: 26,
    recap: mailOf({ queuedAt: '2026-10-26T00:10:00.000Z', sentAt: '2026-10-26T00:11:00.000Z' }),
  }),
  slotOf({
    id: '6721a0f0c0ffee0000000011',
    ...weekOf(42),
    status: 'CANCELLED',
    cancelledReason: 'owner_changed',
    repo: { githubId: '33221101', nameWithOwner: 'hubot/micro-queue', createdAt: null },
    package: { registry: 'NPM', name: 'micro-queue' },
    headsUp: null,
    starsAtStart: null,
    starsNow: null,
    visits: 0,
    githubClicks: 0,
  }),
  slotOf({
    id: '6721a0f0c0ffee0000000012',
    ...weekOf(41),
    status: 'OPTED_OUT',
    optedOutAt: '2026-10-09T08:00:00.000Z',
    repo: { githubId: '33221102', nameWithOwner: 'example-dev/limit-it', createdAt: null },
    package: { registry: 'NPM', name: 'limit-it' },
    starsAtStart: null,
    starsNow: null,
    visits: 0,
    githubClicks: 0,
  }),
  slotOf({
    id: '6721a0f0c0ffee0000000013',
    ...weekOf(40),
    status: 'DONE',
    preview: true,
    starsAtStart: 930,
    starsNow: 941,
    starsGained: 11,
  }),
];

export function boardOf(overrides: Partial<HeroBoard> = {}): HeroBoard {
  return {
    preview: false,
    live: [LIVE],
    upcoming: [NO_RECEIPT, NOT_TOLD, HELD],
    nextWeek: { ...weekOf(45), closesAt: '2026-10-28T23:00:00.000Z' },
    firstOpenWeek: { ...weekOf(45), closesAt: '2026-10-28T23:00:00.000Z' },
    shortlist: [candidateOf(), CHECKED],
    shortlistBuiltAt: '2026-10-27T03:04:00.000Z',
    past: PAST,
    optOuts: [{ maintainerGithubId: '170270', login: 'example-dev', at: '2026-10-09T08:00:00.000Z' }],
    ...overrides,
  };
}
