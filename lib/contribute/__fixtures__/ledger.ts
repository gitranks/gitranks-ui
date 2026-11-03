import type { ContributeLedger, ContributeLedgerPr, ContributeLedgerRepo } from '../ledger.types';

/** Synthetic ledger rows for the catalogue and the specs: made-up repositories, never real ones. */
export const ledgerPr = (over: Partial<ContributeLedgerPr> = {}): ContributeLedgerPr => ({
  repo: 'driftwood-js/driftwood',
  number: 912,
  url: 'https://github.com/driftwood-js/driftwood/pull/912',
  title: 'Keep scroll position when a nested layout re-renders',
  state: 'OPEN',
  openedAt: '2026-10-27T10:00:00.000Z',
  endedAt: null,
  ...over,
});

export const ledgerRepo = (over: Partial<ContributeLedgerRepo> = {}): ContributeLedgerRepo => ({
  repo: 'driftwood-js/driftwood',
  opened: 1,
  merged: 0,
  closed: 0,
  open: 1,
  takesNewPrs: true,
  latestOpenedAt: '2026-10-27T10:00:00.000Z',
  ...over,
});

const RECENT: ContributeLedgerPr[] = [
  ledgerPr(),
  ledgerPr({
    repo: 'fern-lang/fern',
    number: 2490,
    url: 'https://github.com/fern-lang/fern/pull/2490',
    title: 'Keep trailing comments when formatting match arms',
    state: 'MERGED',
    openedAt: '2026-10-22T09:00:00.000Z',
    endedAt: '2026-10-26T15:00:00.000Z',
  }),
  ledgerPr({
    repo: 'quill-charts/quill',
    number: 88,
    url: 'https://github.com/quill-charts/quill/pull/88',
    title: 'Clamp the tooltip inside the plot area on narrow screens',
    state: 'CLOSED',
    openedAt: '2026-10-20T12:00:00.000Z',
    endedAt: '2026-10-21T08:00:00.000Z',
  }),
  ledgerPr({
    repo: 'tidepool-rs/tidepool',
    number: 4031,
    url: 'https://github.com/tidepool-rs/tidepool/pull/4031',
    title: 'fix(cli): read the config path from TIDEPOOL_CONFIG before the default',
    openedAt: '2026-10-15T08:00:00.000Z',
  }),
];

/** The ledger as a previewer sees it: the bar on top. */
export const ledger: ContributeLedger = {
  totals: {
    opened: 4,
    merged: 1,
    closed: 1,
    open: 2,
    mergeRate: 0.5,
    repos: 4,
    people: 1,
    latestMerged: { repo: 'fern-lang/fern', at: '2026-10-26T15:00:00.000Z' },
    latestClosed: { repo: 'quill-charts/quill', at: '2026-10-21T08:00:00.000Z' },
    oldestOpenAt: '2026-10-15T08:00:00.000Z',
  },
  weeks: [
    { weekStart: '2026-10-12', merged: 0, closed: 0, open: 1 },
    { weekStart: '2026-10-19', merged: 1, closed: 1, open: 0 },
    { weekStart: '2026-10-26', merged: 0, closed: 0, open: 1 },
  ],
  repos: [
    ledgerRepo(),
    ledgerRepo({ repo: 'fern-lang/fern', merged: 1, open: 0, latestOpenedAt: '2026-10-22T09:00:00.000Z' }),
    ledgerRepo({
      repo: 'quill-charts/quill',
      closed: 1,
      open: 0,
      takesNewPrs: false,
      latestOpenedAt: '2026-10-20T12:00:00.000Z',
    }),
    ledgerRepo({ repo: 'tidepool-rs/tidepool', latestOpenedAt: '2026-10-15T08:00:00.000Z' }),
  ],
  recent: RECENT,
  saidNo: { total: 96, optedOut: 1, aiPolicy: 95, outsidePrsClosed: 0, paused: 0, inPool: 8335 },
  readAt: '2026-10-28T11:50:00.000Z',
  preview: { prs: 4, merged: 1, peopleBesides: 0, goalPrs: 25, goalMerged: 10, goalPeopleBesides: 5 },
};

/** The same, public: no bar. */
export const publicLedger: ContributeLedger = { ...ledger, preview: null };

/** Before the first PR. */
export const emptyLedger: ContributeLedger = {
  ...ledger,
  totals: {
    opened: 0,
    merged: 0,
    closed: 0,
    open: 0,
    mergeRate: null,
    repos: 0,
    people: 0,
    latestMerged: null,
    latestClosed: null,
    oldestOpenAt: null,
  },
  weeks: [],
  repos: [],
  recent: [],
  preview: { prs: 0, merged: 0, peopleBesides: 0, goalPrs: 25, goalMerged: 10, goalPeopleBesides: 5 },
};
