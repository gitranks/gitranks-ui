/** The Contribute ledger as the API's `contributeLedger` answers it (ledger design 2026-11-03 §4). */

export type ContributeLedgerState = 'MERGED' | 'CLOSED' | 'OPEN';

export type ContributeLedgerLatest = { repo: string; at: string };

export type ContributeLedgerTotals = {
  opened: number;
  merged: number;
  closed: number;
  open: number;
  /** 0 to 1; null while none ended. */
  mergeRate: number | null;
  repos: number;
  people: number;
  latestMerged: ContributeLedgerLatest | null;
  latestClosed: ContributeLedgerLatest | null;
  oldestOpenAt: string | null;
};

export type ContributeLedgerWeek = { weekStart: string; merged: number; closed: number; open: number };

export type ContributeLedgerRepo = {
  repo: string;
  opened: number;
  merged: number;
  closed: number;
  open: number;
  takesNewPrs: boolean;
  latestOpenedAt: string;
};

export type ContributeLedgerPr = {
  repo: string;
  number: number;
  url: string;
  title: string;
  state: ContributeLedgerState;
  openedAt: string;
  endedAt: string | null;
};

export type ContributeLedgerSaidNo = {
  total: number;
  optedOut: number;
  aiPolicy: number;
  outsidePrsClosed: number;
  paused: number;
  inPool: number;
};

/** Only while the ledger is not public: the bar that opens it. */
export type ContributeLedgerPreview = {
  prs: number;
  merged: number;
  peopleBesides: number;
  goalPrs: number;
  goalMerged: number;
  goalPeopleBesides: number;
};

export type ContributeLedger = {
  totals: ContributeLedgerTotals;
  weeks: ContributeLedgerWeek[];
  repos: ContributeLedgerRepo[];
  recent: ContributeLedgerPr[];
  saidNo: ContributeLedgerSaidNo;
  readAt: string;
  preview: ContributeLedgerPreview | null;
};
