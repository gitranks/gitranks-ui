import type { PrTimeline, PrTimelineMilestone } from '../pr-timeline.types';

const row = (
  over: Partial<PrTimelineMilestone> & Pick<PrTimelineMilestone, 'kind' | 'at' | 'by'>,
): PrTimelineMilestone => ({
  login: null,
  text: null,
  overridden: null,
  minutes: null,
  passed: null,
  tries: null,
  failingFirst: null,
  files: null,
  added: null,
  removed: null,
  testsAdded: null,
  commits: null,
  replies: null,
  reviewState: null,
  dayOnly: null,
  number: null,
  ...over,
});

const MADE: PrTimelineMilestone[] = [
  row({ kind: 'PICKED', at: '2026-10-24T09:12:00.000Z', by: 'GITRANKS', number: 871 }),
  row({
    kind: 'CHECKED',
    at: '2026-10-24T09:14:00.000Z',
    by: 'AGENT',
    minutes: 6,
    text: 'Reproduced on main: the layout cache is keyed by the raw path, so /docs and /docs/ miss each other.',
  }),
  row({
    kind: 'WORKED',
    at: '2026-10-24T09:20:00.000Z',
    by: 'AGENT',
    minutes: 38,
    files: 3,
    added: 24,
    removed: 6,
    testsAdded: 1,
    text: 'Layout lookups used the raw route path as the cache key. It now normalizes the path first.',
  }),
  row({ kind: 'CHECKS', at: '2026-10-24T09:58:00.000Z', by: 'GITRANKS', passed: true, failingFirst: true }),
  row({ kind: 'APPROVED', at: '2026-10-24T11:30:00.000Z', by: 'CONTRIBUTOR', login: 'mira-dev' }),
  row({ kind: 'OPENED', at: '2026-10-24T11:31:00.000Z', by: 'GITRANKS', number: 1419 }),
];

const REVIEW: PrTimelineMilestone[] = [
  row({
    kind: 'REVIEWED',
    at: '2026-10-25T08:02:00.000Z',
    by: 'MAINTAINER',
    login: 'tomas-r',
    reviewState: 'CHANGES_REQUESTED',
  }),
  row({
    kind: 'FOLLOW_UP',
    at: '2026-10-25T10:15:00.000Z',
    by: 'AGENT',
    minutes: 9,
    files: 1,
    added: 6,
    removed: 9,
    text: 'Moved the normalizing into the existing normalizePath helper, as asked.',
  }),
  row({ kind: 'UPDATE_APPROVED', at: '2026-10-25T10:40:00.000Z', by: 'CONTRIBUTOR', login: 'mira-dev' }),
  row({ kind: 'PUSHED', at: '2026-10-25T10:41:00.000Z', by: 'GITRANKS', commits: 1, replies: 1 }),
  row({
    kind: 'REVIEWED',
    at: '2026-10-26T14:40:00.000Z',
    by: 'MAINTAINER',
    login: 'tomas-r',
    reviewState: 'APPROVED',
  }),
];

/** Merged after one review round: the canvas's approved board. */
export const mergedTimeline: PrTimeline = {
  attemptId: '6728f0c2a1b2c3d4e5f60718',
  nameWithOwner: 'driftwood-js/driftwood',
  number: 1419,
  url: 'https://github.com/driftwood-js/driftwood/pull/1419',
  title: 'Normalize route paths before the layout cache lookup',
  state: 'MERGED',
  openedAt: '2026-10-24T11:31:00.000Z',
  mergedAt: '2026-10-26T14:45:00.000Z',
  closedAt: null,
  contributorLogin: 'mira-dev',
  reviewed: true,
  agentPhrase: 'Claude (Opus)',
  ownAgent: false,
  issue: { number: 871, url: 'https://github.com/driftwood-js/driftwood/issues/871' },
  change: { files: 4, added: 30, removed: 15, commits: 2, testsAdded: 1 },
  stopped: false,
  helped: 4,
  partial: false,
  modifiedAt: '2026-10-26T14:45:00.000Z',
  milestones: [...MADE, ...REVIEW, row({ kind: 'MERGED', at: '2026-10-26T14:45:00.000Z', by: 'MAINTAINER' })],
};

/** Open, waiting for a maintainer. */
export const openTimeline: PrTimeline = {
  ...mergedTimeline,
  state: 'OPEN',
  mergedAt: null,
  helped: 0,
  change: { files: 3, added: 24, removed: 6, commits: 1, testsAdded: 1 },
  modifiedAt: '2026-10-24T11:31:00.000Z',
  milestones: MADE,
};

/** Closed by a maintainer without a merge. */
export const closedTimeline: PrTimeline = {
  ...openTimeline,
  state: 'CLOSED',
  closedAt: '2026-10-30T16:00:00.000Z',
  milestones: [...MADE, row({ kind: 'CLOSED', at: '2026-10-30T16:00:00.000Z', by: 'MAINTAINER', login: 'tomas-r' })],
};

/** A maintainer stopped GitRanks work on it. */
export const stoppedTimeline: PrTimeline = {
  ...openTimeline,
  stopped: true,
  milestones: [...MADE, row({ kind: 'STOPPED', at: '2026-10-25T09:00:00.000Z', by: 'MAINTAINER' })],
};

/** The contributor's own agent: claimed, worked, passed our checks on its third try. */
export const ownAgentTimeline: PrTimeline = {
  ...openTimeline,
  agentPhrase: 'Codex (GPT)',
  ownAgent: true,
  milestones: [
    row({ kind: 'PICKED', at: '2026-10-24T08:00:00.000Z', by: 'GITRANKS', number: 871 }),
    row({
      kind: 'WORKED',
      at: '2026-10-24T08:00:00.000Z',
      by: 'AGENT',
      minutes: 71,
      files: 2,
      added: 18,
      removed: 4,
      testsAdded: 1,
      text: 'Normalized the path before the cache lookup and added a test for the trailing slash.',
    }),
    row({ kind: 'CHECKS', at: '2026-10-24T09:11:00.000Z', by: 'GITRANKS', passed: true, tries: 3 }),
    row({ kind: 'APPROVED', at: '2026-10-24T09:30:00.000Z', by: 'CONTRIBUTOR', login: 'mira-dev' }),
    row({ kind: 'OPENED', at: '2026-10-24T09:31:00.000Z', by: 'GITRANKS', number: 1419 }),
  ],
};

/** Opened by autopilot, not reviewed by a person; some of our checks failed. */
export const autopilotTimeline: PrTimeline = {
  ...openTimeline,
  reviewed: false,
  milestones: MADE.map((each) =>
    each.kind === 'APPROVED'
      ? { ...each, by: 'AUTOPILOT' as const }
      : each.kind === 'CHECKS'
        ? { ...each, passed: false, failingFirst: false }
        : each,
  ),
};

/**
 * A row of a kind this page does not know yet (the API may add one before the page learns it), with the agent's own
 * text, before the merge: the kind is cast, as the API's answer is not checked against the list.
 */
export const unknownKindTimeline: PrTimeline = {
  ...mergedTimeline,
  milestones: [
    ...mergedTimeline.milestones.slice(0, -1),
    row({
      kind: 'WALKTHROUGH' as PrTimelineMilestone['kind'],
      at: '2026-10-26T14:40:00.000Z',
      by: 'AGENT',
      text: 'Wrote a walkthrough of the fix.',
      minutes: 4,
    }),
    ...mergedTimeline.milestones.slice(-1),
  ],
};
