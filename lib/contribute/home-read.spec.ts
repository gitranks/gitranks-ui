import { describe, expect, it } from 'vitest';

import { activityOf, runOf } from './__fixtures__/agent-runs';
import { contributor, key, mcpToken, NOW, settings, views } from './__fixtures__/contribute-views';
import {
  atWordsOf,
  homeAgentReadOf,
  homeBoxesReadOf,
  homeMergedReadOf,
  homeNeedsYouOf,
  ownAgentNameOf,
} from './home-read';
import { prList, prRow } from '@/lib/workspace/__fixtures__/pull-request';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { connectedKeyOf } from '@/lib/workspace/contribute-state';
import type { PullRequestListWithMerged } from '@/lib/workspace/pull-request-page.types';

const TOTALS = { merged: 7, reposHelped: 6 };

const viewWith = (patch: Parameters<typeof contributor>[0], over: Partial<ContributeView> = {}): ContributeView => ({
  ...views.active,
  contributor: contributor(patch),
  ...over,
});

const SPEND = contributor().spend!;

const listOf = (over: Partial<PullRequestListWithMerged> = {}): PullRequestListWithMerged => ({
  ...prList({
    rows: [
      prRow('APPROVE', { attemptId: 'a1' }),
      prRow('WITH_MAINTAINERS', { attemptId: 'a2' }),
      prRow('OPEN', { attemptId: 'a3' }),
      prRow('FIXING', { attemptId: 'a4' }),
    ],
  }),
  merged: {
    newest: prRow('MERGED', {
      repo: 'driftwood-js/driftwood',
      issueNumber: 871,
      number: 912,
      title: 'Count the last page when the total divides evenly',
      since: '2026-10-25T10:00:00.000Z',
    }),
    newestPublicPage: true,
  },
  ...over,
});

describe('atWordsOf', () => {
  it('writes a time today by the clock alone, and another day with its date', () => {
    expect(atWordsOf('2026-10-28T14:00:00.000Z', NOW)).toBe('14:00 UTC');
    expect(atWordsOf('2026-10-29T09:30:00.000Z', NOW)).toBe('Oct 29, 09:30 UTC');
  });
});

describe('connectedKeyOf', () => {
  it('gives the Claude key while it works or waits, and nothing for a refused key or none', () => {
    expect(connectedKeyOf(views.active)?.state).toBe('VALID');
    expect(connectedKeyOf(views.exhausted)?.state).toBe('EXHAUSTED');
    expect(connectedKeyOf(views.limitReached)?.state).toBe('LIMIT_REACHED');
    expect(connectedKeyOf(views.keyInvalid)).toBeUndefined();
    expect(connectedKeyOf(viewWith({ credentials: [] }))).toBeUndefined();
    expect(connectedKeyOf(null)).toBeUndefined();
  });
});

describe('ownAgentNameOf', () => {
  it("names the person's own agent by its client, else plainly, and nothing before a connection was used", () => {
    expect(
      ownAgentNameOf({
        ownAgent: {
          paths: { hosted: true, mcp: true },
          tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })],
        },
      }),
    ).toBe('Claude Code');
    expect(
      ownAgentNameOf({
        ownAgent: {
          paths: { hosted: true, mcp: true },
          tokens: [mcpToken({ name: 'my laptop', lastUsedAt: '2026-10-28T09:00:00.000Z' })],
        },
      }),
    ).toBe('Your agent');
    expect(ownAgentNameOf({ ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken()] } })).toBeNull();
    expect(ownAgentNameOf({ ownAgent: undefined })).toBeNull();
  });
});

describe('homeAgentReadOf', () => {
  it('reads the runs, the key, and the pace: the next fix waits for its time while the pace is even', () => {
    const run = runOf({ mode: 'FIX' });
    const read = homeAgentReadOf(views.active, activityOf(run), NOW);
    expect(read.runs).toEqual([run]);
    expect(read.key).toBe(true);
    expect(read.notice).toBeNull();
    expect(read.capHold).toBeNull();
    expect(read.paceHold).toEqual({ at: '14:00 UTC', picksOwn: false });
    // The hosted agent picks its own issues: the hold says it will.
    const picks = viewWith({ settings: { ...settings, hostedLevel: 'NEXT' } });
    expect(homeAgentReadOf(picks, activityOf(), NOW).paceHold).toEqual({ at: '14:00 UTC', picksOwn: true });
  });

  it('has no pace hold when the pace is not even, or the time has come', () => {
    expect(homeAgentReadOf(viewWith({ settings: { ...settings, pace: 'FAST' } }), null, NOW).paceHold).toBeNull();
    const due = viewWith({ spend: { ...SPEND, nextAttemptAt: '2026-10-28T11:00:00.000Z' } });
    expect(homeAgentReadOf(due, null, NOW).paceHold).toBeNull();
  });

  it('says the runs could not be read as null, never as none', () => {
    expect(homeAgentReadOf(views.active, null, NOW).runs).toBeNull();
    expect(homeAgentReadOf(views.active, activityOf(), NOW).runs).toEqual([]);
  });

  it("holds on the first cap with less left than one fix may spend, the day's before the week's and the cycle's", () => {
    const held = (spend: Partial<typeof SPEND>, set: Partial<typeof settings> = {}) =>
      homeAgentReadOf(
        viewWith({ spend: { ...SPEND, nextAttemptAt: null, ...spend }, settings: { ...settings, ...set } }),
        null,
        NOW,
      ).capHold;
    expect(held({ todayUsd: 11 })).toEqual({ period: 'day', attemptCapUsd: 5 });
    expect(held({ todayUsd: 1, weekUsd: 48 }, { weekCapUsd: 50 })).toEqual({ period: 'week', attemptCapUsd: 5 });
    expect(held({ todayUsd: 1, cycleUsd: 197 })).toEqual({ period: 'cycle', attemptCapUsd: 5 });
    expect(held({ todayUsd: 11, cycleUsd: 197 })).toEqual({ period: 'day', attemptCapUsd: 5 });
    // No cap short: nothing to say about caps.
    expect(held({ todayUsd: 1 })).toBeNull();
  });

  it('has no hold without a working key, and reads its notice instead', () => {
    const refused = homeAgentReadOf(views.keyInvalid, null, NOW);
    expect(refused).toMatchObject({ key: false, notice: { kind: 'key-invalid' }, capHold: null, paceHold: null });
    expect(homeAgentReadOf(views.exhausted, null, NOW).notice).toEqual({
      kind: 'exhausted',
      until: '2026-11-14T00:00:00.000Z',
    });
    expect(homeAgentReadOf(views.limitReached, null, NOW).notice).toEqual({
      kind: 'limit-reached',
      until: '2026-11-01T00:00:00.000Z',
    });
    // No key at all is not a key notice.
    const none = viewWith({ credentials: [] });
    expect(homeAgentReadOf(none, null, NOW)).toMatchObject({ key: false, notice: null, paceHold: null });
  });

  it('never takes a notice about the account for one about the key', () => {
    expect(homeAgentReadOf(views.suspended, null, NOW).notice).toBeNull();
  });
});

describe('homeNeedsYouOf', () => {
  it('keeps the rows that need the person, and says a list it could not read as null', () => {
    expect(homeNeedsYouOf(listOf())?.map((row) => row.box)).toEqual(['APPROVE']);
    expect(homeNeedsYouOf(undefined)).toBeNull();
  });
});

describe('homeMergedReadOf', () => {
  it('reads the totals, the newest merged with its public page, and those waiting for their maintainers', () => {
    expect(homeMergedReadOf(listOf(), TOTALS)).toEqual({
      merged: 7,
      reposHelped: 6,
      newest: {
        repo: 'driftwood-js/driftwood',
        issueNumber: 871,
        title: 'Count the last page when the total divides evenly',
        mergedAt: '2026-10-25T10:00:00.000Z',
        publicPage: '/contribute/pr/driftwood-js/driftwood/912',
      },
      waiting: 2,
    });
  });

  it('links no public page the pull request does not have', () => {
    const list = listOf();
    const hidden = { ...list, merged: { ...list.merged!, newestPublicPage: false } };
    expect(homeMergedReadOf(hidden, TOTALS)?.newest?.publicPage).toBeNull();
    const noNumber = { ...list, merged: { newest: { ...list.merged!.newest!, number: null }, newestPublicPage: true } };
    expect(homeMergedReadOf(noNumber, TOTALS)?.newest?.publicPage).toBeNull();
  });

  it('has no newest before anything merged', () => {
    expect(homeMergedReadOf(listOf({ merged: { newest: null, newestPublicPage: false } }), TOTALS)?.newest).toBeNull();
  });

  it('says nothing rather than something untrue: no list, no merged answer, or no totals', () => {
    expect(homeMergedReadOf(undefined, TOTALS)).toBeNull();
    expect(homeMergedReadOf(listOf({ merged: null }), TOTALS)).toBeNull();
    expect(homeMergedReadOf(listOf(), null)).toBeNull();
  });
});

describe('homeBoxesReadOf', () => {
  it('puts every read together, with the first day and the Skills page as given', () => {
    const read = homeBoxesReadOf({
      view: views.active,
      list: listOf(),
      totals: TOTALS,
      activity: activityOf(),
      firstDay: true,
      skillsHref: '/profile/octocat/skills',
      now: NOW,
    });
    expect(read.firstDay).toBe(true);
    expect(read.skillsHref).toBe('/profile/octocat/skills');
    expect(read.needsYou).toHaveLength(1);
    expect(read.agent.key).toBe(true);
    expect(read.merged?.merged).toBe(7);
  });
});

describe('the key a view holds', () => {
  it('reads a key that waits as connected', () => {
    expect(homeAgentReadOf(viewWith({ credentials: [key({ state: 'EXHAUSTED' })] }), null, NOW).key).toBe(true);
  });
});
