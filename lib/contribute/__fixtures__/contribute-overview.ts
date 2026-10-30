import type { ContributeIssue, ContributeIssuePage, ContributeReplyWaiting } from '../contribute.types';
import type { OverviewNeedsRead, OverviewNowRead } from '../overview';
import { attempt, followUpOf, replyDraft } from './contribute-attempts';

/** A pick of the feed. */
export const issue = (patch: Partial<ContributeIssue> = {}): ContributeIssue => ({
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'quill-rs/quill',
  number: 1204,
  url: 'https://github.com/quill-rs/quill/issues/1204',
  title: 'Panic when a span ends at EOF',
  labels: ['bug'],
  language: 'RUST',
  kind: 'BUG',
  size: 'M',
  score: 0.92,
  rank: 1,
  why: 'you write Rust, and it has a clear reproduction',
  ...patch,
});

/** The feed's first page: four picks, ranked, listed out of rank order. */
export const issuePage: ContributeIssuePage = {
  items: [
    issue({ issueId: 'I_2', number: 930, rank: 2, nameWithOwner: 'tidewave/tide', language: 'JS_TS', size: 'S' }),
    issue(),
    issue({ issueId: 'I_4', number: 12, rank: 4, title: 'The fourth pick' }),
    issue({ issueId: 'I_3', number: 381, rank: 3, nameWithOwner: 'oxbow-dev/oxbow', language: 'GO', size: 'S' }),
  ],
  next: null,
  total: 4,
  computedAt: '2026-10-28T11:00:00.000Z',
};

/** A reply draft waiting for the user, on pull request #1419. */
export const replyWaiting = (patch: Partial<ContributeReplyWaiting> = {}): ContributeReplyWaiting => ({
  ...replyDraft(),
  nameWithOwner: 'driftwood-js/driftwood',
  prNumber: 1419,
  inReview: false,
  ...patch,
});

/** Two reviews ready, the older one first by `reviewAt` though it was updated last. */
export const reviewsReady = [
  attempt({
    attemptId: 'A_NEW',
    number: 2481,
    nameWithOwner: 'fern-lang/fern',
    title: 'Formatter drops a trailing comment in match arms',
    reviewAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
  }),
  attempt({
    attemptId: 'A_OLD',
    number: 77,
    reviewAt: '2026-10-27T12:00:00.000Z',
    updatedAt: '2026-10-28T11:30:00.000Z',
  }),
];

/** A follow-up in review on pull request #1419. */
export const followUpInReview = attempt({
  attemptId: 'A_F1',
  kind: 'FOLLOW_UP',
  followUpOf,
  costUsd: 1.12,
  reviewAt: '2026-10-28T11:00:00.000Z',
});

/** Every read of "Needs you" answered, and nothing waits. */
export const needsNothing: OverviewNeedsRead = { reviews: [], replies: [] };

/** Every read of "Right now" answered: nothing in flight, nothing counted. */
export const nowIdle: OverviewNowRead = { inFlight: [], scheduleCounts: { prBound: 0, queued: 0 } };

/** What each section read, every read answered, with nothing waiting or in flight. */
export const overviewData = () => ({
  needs: needsNothing,
  now: nowIdle,
  impact: { open: 2, merged: 7, closed: 1, reposHelped: 6 },
  noted: [] as const,
  page: issuePage,
});
