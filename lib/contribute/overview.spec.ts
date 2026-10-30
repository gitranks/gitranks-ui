import { describe, expect, it } from 'vitest';

import { attempt, followUpOf } from './__fixtures__/contribute-attempts';
import {
  followUpInReview,
  issuePage,
  needsNothing,
  nowIdle,
  replyWaiting,
  reviewsReady,
} from './__fixtures__/contribute-overview';
import { contributor, firstSpend, mcpToken, NOW, settings, views } from './__fixtures__/contribute-views';
import type { ContributeAttempt, ContributeView } from './contribute.types';
import {
  impactTilesOf,
  lastUsedTokenOf,
  NEEDS_YOU_MAX,
  NEEDS_YOU_READ,
  type NeedsYouRow,
  needsYouRowsOf,
  rightNowOf,
  upNextOf,
} from './overview';

const kinds = (rows: NeedsYouRow[]) => rows.map(({ kind }) => kind);
const ids = (rows: NeedsYouRow[]) =>
  rows.map((row) =>
    row.kind === 'replies' ? `replies:${row.attemptId}` : 'attempt' in row ? row.attempt.attemptId : row.kind,
  );

const grantBounce = attempt({
  attemptId: 'A_GRANT',
  submit: {
    step: 'FORK',
    waitUntil: null,
    fork: null,
    branch: null,
    lastError: {
      reason: 'grant_missing',
      note: 'GitHub access is needed to open the PR.',
      at: '2026-10-28T10:00:00.000Z',
    },
  },
});
const autopilot = attempt({
  attemptId: 'A_AUTO',
  state: 'PENDING_AUTOSUBMIT',
  autosubmitAt: '2026-10-28T12:42:00.000Z',
});

/** Both ways set up: a key and a live token the agent has called with. */
const both: ContributeView = {
  ...views.active,
  ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })] },
};

describe('needsYouRowsOf', () => {
  it('orders the rows: the key, GitHub access, autopilot, the reviews oldest ready first, then the replies', () => {
    const view = {
      ...views.keyInvalid,
      grant: { connected: false, login: null },
      ownAgent: { paths: { hosted: true, mcp: false }, tokens: [] },
    };
    const needs = needsYouRowsOf(view, {
      reviews: [...reviewsReady, autopilot, grantBounce],
      replies: [replyWaiting()],
    });

    expect(kinds(needs.rows)).toEqual(['key', 'grant', 'autopilot', 'review', 'review']);
    expect(ids(needs.rows).slice(3)).toEqual(['A_OLD', 'A_NEW']);
    expect(needs.total).toBe(6);
    expect(needs.complete).toBe(true);
  });

  it('orders the reviews by their last update while reviewAt is not answered', () => {
    const unanswered = reviewsReady.map(({ reviewAt: _at, ...rest }) => rest as ContributeAttempt);
    const { rows } = needsYouRowsOf(views.active, { reviews: unanswered, replies: [] });

    expect(ids(rows)).toEqual(['A_NEW', 'A_OLD']);
  });

  it('never repeats a bounced review as a review row', () => {
    const { rows } = needsYouRowsOf(views.grantMissing, { reviews: [grantBounce], replies: [] });

    expect(kinds(rows)).toEqual(['grant']);
  });

  it('shows five rows at most, and counts the rest', () => {
    const reviews = Array.from({ length: 7 }, (_, index) =>
      attempt({ attemptId: `A_${index}`, reviewAt: `2026-10-2${index}T00:00:00.000Z` }),
    );
    const needs = needsYouRowsOf(views.active, { reviews, replies: [] });

    expect(needs.rows).toHaveLength(NEEDS_YOU_MAX);
    expect(needs.total).toBe(7);
  });

  it("folds a follow-up's drafts into its review or autopilot row, never a row of their own", () => {
    const autoFollowUp = attempt({ attemptId: 'A_F2', state: 'PENDING_AUTOSUBMIT', kind: 'FOLLOW_UP', followUpOf });
    const { rows } = needsYouRowsOf(views.active, {
      reviews: [followUpInReview, autoFollowUp],
      replies: [
        replyWaiting({ attemptId: 'A_F1', inReview: true }),
        replyWaiting({ draftId: 'D_2', attemptId: 'A_F1', inReview: true }),
        replyWaiting({ draftId: 'D_3', attemptId: 'A_F2', inReview: true }),
      ],
    });

    expect(rows.map((row) => [row.kind, 'replies' in row ? row.replies : null])).toEqual([
      ['autopilot', 1],
      ['review', 2],
    ]);
  });

  it('shows nothing of the folded drafts while the reviews are not answered, and is not complete', () => {
    const needs = needsYouRowsOf(views.active, {
      reviews: undefined,
      replies: [replyWaiting({ inReview: true }), replyWaiting({ draftId: 'D_9', attemptId: 'A_F9' })],
    });

    expect(ids(needs.rows)).toEqual(['replies:A_F9']);
    expect(needs.complete).toBe(false);
  });

  it('makes one row of the drafts of each follow-up outside review', () => {
    const { rows } = needsYouRowsOf(views.active, {
      reviews: [],
      replies: [
        replyWaiting(),
        replyWaiting({ draftId: 'D_2', comment: null }),
        replyWaiting({ draftId: 'D_3', attemptId: 'A_F7', prNumber: 7 }),
      ],
    });

    expect(rows).toMatchObject([
      { kind: 'replies', attemptId: 'A_F1', prNumber: 1419, drafts: [{ draftId: 'D_1' }, { draftId: 'D_2' }] },
      { kind: 'replies', attemptId: 'A_F7', prNumber: 7 },
    ]);
  });

  it('is complete only when every read answered', () => {
    expect(needsYouRowsOf(views.active, needsNothing)).toEqual({ rows: [], total: 0, complete: true });
    expect(needsYouRowsOf(views.active, { reviews: [], replies: undefined }).complete).toBe(false);
    expect(needsYouRowsOf(views.active, { reviews: undefined, replies: [] }).complete).toBe(false);
  });

  it('asks a user with neither way set up for one, and never guesses so while their own agent is unread', () => {
    expect(kinds(needsYouRowsOf(views.onboardedNoPath, needsNothing).rows)).toEqual(['no-way']);

    const unread = { ...views.onboardedNoPath, ownAgent: undefined };
    expect(needsYouRowsOf(unread, needsNothing)).toEqual({ rows: [], total: 0, complete: false });
    expect(needsYouRowsOf(views.agentOnboarded, needsNothing).rows).toEqual([]);
  });
});

describe('rightNowOf', () => {
  const inFlight = (patch: Partial<ContributeAttempt>) =>
    attempt({
      attemptId: 'A_RUN',
      state: 'RUNNING',
      runner: 'MANAGED_AGENTS',
      createdAt: '2026-10-28T11:48:00.000Z',
      ...patch,
    });
  const hostedOf = (view: ContributeView, read = nowIdle, page = issuePage) => rightNowOf(view, read, page, NOW).hosted;

  it.each(['CLAIMING', 'RUNNING', 'CHECKS'] as const)(
    'shows a hosted attempt in %s as working, and reads the page again',
    (state) => {
      const now = rightNowOf(views.active, { ...nowIdle, inFlight: [inFlight({ state })] }, issuePage, NOW);

      expect(now.hosted).toMatchObject({ kind: 'working', attempt: { state } });
      expect(now.live).toBe(true);
    },
  );

  it("holds the view's own blocks before anything the scheduler counts", () => {
    const counts = { inFlight: [], scheduleCounts: { prBound: 9, queued: 0 } };
    expect(hostedOf({ ...views.active, attemptsOpen: false }, counts)?.kind).toBe('closed');
    expect(hostedOf(views.paused, counts)?.kind).toBe('paused');
    expect(hostedOf(views.keyInvalid, counts)?.kind).toBe('key-invalid');
    expect(hostedOf(views.exhausted, counts)).toEqual({
      kind: 'key-waiting',
      reason: 'EXHAUSTED',
      until: '2026-11-14T00:00:00.000Z',
    });
  });

  it("says the user's own agent holds every slot", () => {
    const agentHolds = { ...nowIdle, inFlight: [inFlight({ runner: 'MCP' })] };
    expect(hostedOf(both, agentHolds)).toEqual({ kind: 'slots-taken', slots: 1 });

    const twoSlots = { ...both, contributor: contributor({ settings: { ...settings, attemptsAtATime: 2 } }) };
    expect(hostedOf(twoSlots, agentHolds)?.kind).toBe('paced');
  });

  it('says the open PRs cap, then nothing queued, in their place after the slots', () => {
    expect(hostedOf(views.active, { inFlight: [], scheduleCounts: { prBound: 3, queued: 0 } })).toEqual({
      kind: 'pr-cap',
      prBound: 3,
      cap: 3,
    });

    const queued = { ...views.active, contributor: contributor({ settings: { ...settings, pace: 'QUEUED' } }) };
    expect(hostedOf(queued, { inFlight: [], scheduleCounts: { prBound: 0, queued: 0 } })?.kind).toBe('nothing-queued');
    expect(hostedOf(queued, { inFlight: [], scheduleCounts: { prBound: 0, queued: 1 } })?.kind).toBe('paced');
  });

  it('then the guide: no room, paced, no issues and soon', () => {
    const withSpend = (nextAttemptAt: string | null) => ({
      ...views.active,
      contributor: contributor({ spend: { ...firstSpend, nextAttemptAt } }),
    });

    expect(hostedOf(withSpend(null))?.kind).toBe('no-room');
    expect(hostedOf(withSpend('2026-10-28T14:00:00.000Z'))).toEqual({ kind: 'paced', at: '2026-10-28T14:00:00.000Z' });
    expect(hostedOf(withSpend('2026-10-28T11:00:00.000Z'), nowIdle, { ...issuePage, items: [] })?.kind).toBe(
      'no-issues',
    );
    expect(hostedOf(withSpend('2026-10-28T11:00:00.000Z'))?.kind).toBe('soon');
  });

  it('never says soon while the attempts in flight or the counts are not answered, and still says no room', () => {
    const free = { ...views.active, contributor: contributor({ spend: { ...firstSpend, nextAttemptAt: null } }) };
    const soon = { ...views.active, contributor: contributor({ spend: firstSpend }) };

    expect(hostedOf(soon, { inFlight: undefined, scheduleCounts: { prBound: 0, queued: 0 } })?.kind).toBe('unknown');
    expect(hostedOf(soon, { inFlight: [], scheduleCounts: undefined })?.kind).toBe('unknown');
    expect(hostedOf(free, { inFlight: undefined, scheduleCounts: undefined })?.kind).toBe('no-room');
    // A hold the read that answered shows.
    expect(hostedOf(soon, { inFlight: undefined, scheduleCounts: { prBound: 3, queued: 0 } })?.kind).toBe('pr-cap');
  });

  it('shows the cycle for a key alone, and no hosted card without one', () => {
    expect(rightNowOf(views.active, nowIdle, issuePage, NOW)).toMatchObject({ cycle: true, live: false });
    const agentOnly = rightNowOf(views.agentOnboarded, nowIdle, issuePage, NOW);
    expect(agentOnly.hosted).toBeUndefined();
    expect(agentOnly.cycle).toBe(false);
  });

  it("shows the user's own agent holding an issue, idle, never called, paused, or unread", () => {
    const own = (view: ContributeView, read = nowIdle) => rightNowOf(view, read, issuePage, NOW).ownAgent;
    const held = attempt({ state: 'RUNNING', runner: 'MCP', agent: { name: 'CLAUDE_CODE', model: null } });

    expect(own(views.agentOnboarded, { ...nowIdle, inFlight: [held] })).toMatchObject({
      kind: 'holding',
      agent: 'Claude Code',
      lastCallAt: '2026-10-28T11:05:00.000Z',
    });
    // Before a submission the agent names itself nowhere: the token used last stands in.
    expect(own(views.agentOnboarded, { ...nowIdle, inFlight: [{ ...held, agent: null }] })).toMatchObject({
      agent: 'Claude Code on macOS',
    });
    expect(own(views.agentOnboarded)).toEqual({
      kind: 'idle',
      token: 'Claude Code on macOS',
      lastCallAt: '2026-10-28T11:05:00.000Z',
    });
    expect(
      own({ ...views.agentOnboarded, ownAgent: { paths: { hosted: false, mcp: true }, tokens: [mcpToken()] } }),
    ).toEqual({
      kind: 'never-called',
    });
    expect(own({ ...views.agentOnboarded, paused: true })).toEqual({ kind: 'paused' });
    expect(own(views.agentOnboarded, { ...nowIdle, inFlight: undefined })).toMatchObject({ kind: 'unknown' });
    expect(own(views.active)).toBeUndefined();
  });
});

describe('lastUsedTokenOf', () => {
  it('is the token called with last, none before the first call', () => {
    const older = mcpToken({ id: 'T_1', name: 'older', lastUsedAt: '2026-10-27T00:00:00.000Z' });
    const newer = mcpToken({ id: 'T_2', name: 'newer', lastUsedAt: '2026-10-28T00:00:00.000Z' });

    expect(lastUsedTokenOf([older, newer, mcpToken({ id: 'T_3' })])?.name).toBe('newer');
    expect(lastUsedTokenOf([mcpToken()])).toBeUndefined();
  });
});

describe('impactTilesOf', () => {
  it('shows merged, open, repos helped and how far autopilot is', () => {
    expect(impactTilesOf(views.active, { open: 2, merged: 7, closed: 1, reposHelped: 6 })).toEqual([
      { name: 'merged', value: '7', label: 'pull requests merged' },
      { name: 'open', value: '2', label: 'open, waiting on maintainers' },
      { name: 'repos', value: '6', label: 'repos helped' },
      { name: 'autopilot', value: '1 of 3', label: 'merged to unlock autopilot' },
    ]);
  });

  it('reads "–" for repos helped alone while it is not answered, and is nothing without the totals', () => {
    expect(impactTilesOf(views.active, { open: 0, merged: 0, closed: 0 })?.[2]).toEqual({
      name: 'repos',
      value: '–',
      label: 'repos helped',
    });
    expect(impactTilesOf(views.active, undefined)).toBeUndefined();
  });

  it("counts autopilot from the record's merged to unlock, and says when it is on", () => {
    const totals = { open: 0, merged: 5, closed: 0 };
    expect(impactTilesOf(views.autopilotRelocked, totals)?.[3].value).toBe('1 of 3');
    expect(impactTilesOf(views.autopilotUnlocked, totals)?.[3]).toEqual({
      name: 'autopilot',
      value: 'On',
      label: 'autopilot unlocked',
    });
  });
});

describe('the review fixes', () => {
  const hosted = (patch: Partial<ContributeAttempt>) =>
    attempt({ attemptId: 'A_RUN', state: 'RUNNING', createdAt: '2026-10-28T11:48:00.000Z', ...patch });

  it('never gives an attempt to the key while whose it is is unread, and never says the own agent holds none', () => {
    // The own-agent fields did not answer: no `runner`.
    const { runner: _runner, ...unread } = hosted({});
    const read = { ...nowIdle, inFlight: [unread as ContributeAttempt] };
    const now = rightNowOf(both, read, issuePage, NOW);

    expect(now.hosted).toEqual({ kind: 'unknown' });
    expect(now.ownAgent).toEqual({
      kind: 'unknown',
      token: 'Claude Code on macOS',
      lastCallAt: '2026-10-28T09:00:00.000Z',
    });
    expect(now.live).toBe(true);

    // What does not depend on it still shows: the view's blocks, the scheduler's counts.
    expect(rightNowOf({ ...both, paused: true }, read, issuePage, NOW).hosted?.kind).toBe('paused');
    expect(rightNowOf(both, { ...read, scheduleCounts: { prBound: 3, queued: 0 } }, issuePage, NOW).hosted?.kind).toBe(
      'pr-cap',
    );
    // Answered, it is the key's.
    expect(
      rightNowOf(both, { ...nowIdle, inFlight: [hosted({ runner: 'MANAGED_AGENTS' })] }, issuePage, NOW).hosted?.kind,
    ).toBe('working');
  });

  it('shows a bounced review as a review once GitHub access is granted, and as GitHub access while unread', () => {
    const connected = { ...views.active, grant: { connected: true, login: 'octocat' } };
    expect(kinds(needsYouRowsOf(connected, { reviews: [grantBounce], replies: [] }).rows)).toEqual(['review']);
    expect(kinds(needsYouRowsOf(views.grantMissing, { reviews: [grantBounce], replies: [] }).rows)).toEqual(['grant']);
    expect(kinds(needsYouRowsOf(views.fieldsMissing, { reviews: [grantBounce], replies: [] }).rows)).toEqual(['grant']);
  });

  it('never says soon while the feed is unread, and keeps the holds before it', () => {
    const soon = { ...views.active, contributor: contributor({ spend: firstSpend }) };
    expect(rightNowOf(soon, nowIdle, undefined, NOW).hosted).toEqual({ kind: 'unknown' });
    expect(rightNowOf(views.active, nowIdle, undefined, NOW).hosted?.kind).toBe('paced');
    expect(rightNowOf(soon, nowIdle, issuePage, NOW).hosted?.kind).toBe('soon');
  });

  it('reads every review that can wait, and cuts the newest, counting them all', () => {
    // At most one first attempt per open PR (10 at the most) and one follow-up per open PR.
    expect(NEEDS_YOU_READ).toBeGreaterThanOrEqual(20);

    // As the API lists them: newest first.
    const reviews = Array.from({ length: 20 }, (_, index) =>
      attempt({ attemptId: `A_${index}`, reviewAt: new Date(Date.UTC(2026, 9, 28 - index)).toISOString() }),
    );
    const needs = needsYouRowsOf(views.active, { reviews, replies: [] });

    expect(ids(needs.rows)).toEqual(['A_19', 'A_18', 'A_17', 'A_16', 'A_15']);
    expect(needs.total).toBe(20);
  });
});

describe('upNextOf', () => {
  it("is the feed's top three, in rank order", () => {
    expect(upNextOf(issuePage).map(({ issueId }) => issueId)).toEqual(['I_1', 'I_2', 'I_3']);
  });
});
