import type { ContributeIssueSize } from './contribute.types';

/**
 * A masked issue and the page of one issue, as the GitRanks GraphQL API answers them. A masked issue carries nothing
 * that names its issue: no project, number, link or GitHub id, and a rewritten title. "See the full issue" uncovers
 * one for the viewer and holds it for them for 15 minutes.
 */

/** A good sign a masked issue shows; never a warning. */
export type IssueHintKind = 'AGREED' | 'MERGES_OUTSIDE' | 'MERGED_HERE';

export type IssueHint = {
  kind: IssueHintKind;
  /** With `MERGED_HERE`: how many fixes. */
  count: number | null;
};

export type MaskedIssue = {
  /** The mask id: public, and the id of the page of one issue. */
  id: string;
  /** The title rewritten without the project, its files, numbers or people. */
  title: string;
  /** The repository's GitHub language, e.g. "TypeScript". */
  language: string | null;
  size: ContributeIssueSize | null;
  /** The issue's kind: bug, feature, docs, tests, refactor, performance. */
  kind: string | null;
  /** The project's rank tier, 1 (Stardust) to 7 (Supernova); null when it has none. */
  projectTier: number | null;
  /** `owner/name`, only on a page about that one project. */
  project: string | null;
  /** Up to two good signs. */
  hints: IssueHint[];
};

/** The issue in full, for the viewer who holds it. */
export type FullIssue = {
  /** The mask id. */
  id: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  /** The issue's page on GitHub. */
  url: string;
  /** The issue's title, as GitHub has it. */
  title: string;
  labels: string[];
  /** The project's stars. */
  stars: number | null;
  /** The project asks for an agreement to be signed; null: not known. */
  agreementToSign: boolean | null;
};

/** The full issues the viewer may see today, and what the limit is made of. */
export type IssueLooksToday = {
  /** Full issues a day. */
  limit: number;
  /** Left today, until 00:00 UTC. */
  left: number;
  /** The GitRanks tier, 1 Rookie to 7 Legend; null when not ranked. */
  tier: number | null;
  /** The tier's part of the limit. */
  base: number;
  /** Pull requests merged through GitRanks. */
  merged: number;
  /** A fair-use warning holds the limit down. */
  warned: boolean;
};

/** Another issue the viewer holds now. */
export type IssueHeld = { id: string; until: string };

/** The page of one issue for the viewer: masked (no look), full (held by them), or how their look ended or was refused. */
export type IssuePageState =
  | 'MASKED'
  | 'FULL'
  | 'STARTED'
  | 'GIVEN_BACK'
  | 'EXPIRED'
  | 'REPLACED'
  | 'TAKEN'
  | 'LIMIT'
  | 'LEFT_POOL'
  | 'NOT_AVAILABLE';

/**
 * Why an issue is not for the viewer. After giving it back: `TAKEN`, `FIXED`, `NOT_MY_PROJECT`, `TOO_HARD`, `UNCLEAR`,
 * `WRONG_MATCH`. Skipping before a look: `TOO_HARD`, `NOT_INTERESTING`.
 */
export type IssueOutReason =
  | 'TAKEN'
  | 'FIXED'
  | 'NOT_MY_PROJECT'
  | 'TOO_HARD'
  | 'UNCLEAR'
  | 'WRONG_MATCH'
  | 'NOT_INTERESTING';

export type IssuePage = {
  state: IssuePageState;
  masked: MaskedIssue | null;
  /** Only while the viewer holds it (`FULL`). */
  full: FullIssue | null;
  /** With `FULL`: when the hold ends. */
  until: string | null;
  /** Another issue the viewer holds now: seeing this one gives it back. */
  holding: IssueHeld | null;
  /** With `GIVEN_BACK`: the reasons saved so far. */
  reasons: IssueOutReason[];
  /** With `GIVEN_BACK`: the note saved. */
  note: string | null;
  /** With `STARTED`: the address of the work on it. */
  startPath: string | null;
  looks: IssueLooksToday | null;
};

/** What a press of "See the full issue" did. */
export type IssueLookOutcome = 'OK' | 'TAKEN' | 'LIMIT' | 'NOT_AVAILABLE' | 'LEFT_POOL' | 'SUSPENDED';

export type IssueLooked = { outcome: IssueLookOutcome; page: IssuePage | null };

/** The numbers of a night, the same for everyone. */
export type IssueNumbers = {
  /** Open issues the rules and models have read. */
  read: number;
  /** Of them, the ones kept now. */
  kept: number;
  at: string;
};

/** A request to look again at a closed access, and whether it was answered. */
export type FairUseAppeal = { at: string; answeredAt: string | null };
