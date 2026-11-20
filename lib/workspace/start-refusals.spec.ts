import { describe, expect, it } from 'vitest';

import type { IssueStart } from './issue-start';
import { startViewOf, startViews } from './start/__fixtures__/start-page';
import { ISSUE_START_FAILED, issueStartRefusalOf, startRefusalOf } from './start-refusals';

const BACK = { href: '/contribute#issues' as const, label: 'Issues for you' };
const words = (view = startViews.open) => startRefusalOf(view, BACK);

describe("the Start page's refusals", () => {
  it('says nothing without one, or for YOURS, which the page acts on', () => {
    expect(words(startViews.open)).toBeNull();
    expect(words(startViews.yoursFix)).toBeNull();
    expect(words(startViews.yoursLesson)).toBeNull();
  });

  it('sends the issue-level refusals back to the issues the page came from', () => {
    for (const [view, text] of [
      [startViews.taken, "Someone else's agent took this issue."],
      [startViews.closed, 'This issue was closed meanwhile.'],
      [startViews.repoUnavailable, "This project can't take a pull request from us right now."],
      [startViews.unavailable, "This issue can't be started here."],
      [startViews.daily, "You've started as many issues as one day allows. You can start more after 00:00 UTC."],
    ] as const) {
      expect(words(view)).toEqual({ kind: 'notice', text, action: BACK });
    }
    // A refusal this page doesn't know yet is said as one it can't start.
    expect(words(startViewOf({ refusal: 'SOMETHING_NEW' as never }))).toEqual({
      kind: 'notice',
      text: "This issue can't be started here.",
      action: BACK,
    });
  });

  it('links the lesson in progress, or the Pull requests tab when it was not read', () => {
    expect(words(startViews.ownInProgress)).toEqual({
      kind: 'notice',
      text: 'Your lesson on “Keep trailing comments when formatting match arms” is in progress. One lesson of your own at a time: this one can start once that one is done.',
      action: { href: '/my/pull-requests/by-attempt/A_3?view=lesson', label: 'Back to your lesson' },
    });
    expect(words(startViewOf({ refusal: 'OWN_IN_PROGRESS' }))).toEqual({
      kind: 'notice',
      text: 'Another lesson of yours is in progress. One lesson of your own at a time: this one can start once that one is done.',
      action: { href: '/my/pull-requests', label: 'Pull requests' },
    });
  });

  it('tells the two pauses apart: Resume for the person’s own, a note to us for one GitRanks holds', () => {
    expect(words(startViews.pausedByYou)).toEqual({
      kind: 'paused-by-you',
      text: "Contributing is paused, so your agent can't take an issue.",
    });
    expect(words(startViews.accountPaused)).toEqual({
      kind: 'notice',
      text: "This account can't start issues right now.",
      action: { href: 'mailto:hello@gitranks.com', label: 'Write to us', external: true },
    });
  });

  it('words LIMIT_REACHED by the limit it hit: the one notice, or the runs at a time', () => {
    expect(words(startViews.limitPrs)).toEqual({ kind: 'limit', counts: { count: 2, limit: 2 } });
    expect(words(startViewOf({ refusal: 'LIMIT_REACHED', limit: 'open_prs_at_a_time' }))).toEqual({
      kind: 'limit',
      counts: { count: 0, limit: 0 },
    });
    const busy = (attempts: number | null) =>
      words(
        startViewOf({ refusal: 'LIMIT_REACHED', limit: 'attempts_at_a_time' }, { limits: { openPrs: null, attempts } }),
      );
    const toPullRequests = { href: '/my/pull-requests', label: 'Pull requests' };
    expect(busy(2)).toEqual({
      kind: 'notice',
      text: '2 of your issues are being worked on, the most at a time. One more can start when a run ends.',
      action: toPullRequests,
    });
    expect(busy(1)).toMatchObject({
      text: 'One of your issues is being worked on, the most at a time. One more can start when a run ends.',
    });
    expect(busy(null)).toMatchObject({
      text: 'Your issues are being worked on, the most at a time. One more can start when a run ends.',
    });
  });
});

describe("an issue row's refused hosted Start", () => {
  const answer = (patch: Partial<IssueStart>): IssueStart => ({
    attempt: null,
    started: false,
    refusal: null,
    value: null,
    holder: null,
    until: null,
    ...patch,
  });
  const words = (patch: Partial<IssueStart>, facts = {}) => issueStartRefusalOf(answer(patch), facts);
  const UNTIL = '2026-11-21T00:00:00.000Z';

  it('says nothing without a refusal', () => {
    expect(
      words({ started: true, attempt: { id: 'A_1', repo: 'acme/widgets', number: 42, state: 'CLAIMING' } }),
    ).toBeNull();
  });

  it('words what holds the place of a run, and links that run or all runs', () => {
    expect(words({ refusal: 'AGENT_BUSY', value: 1, holder: { id: 'A_3', repo: 'acme/widgets', number: 7 } })).toEqual({
      code: 'AGENT_BUSY',
      text: 'One of your issues is being worked on, the most at a time. One more can start when a run ends.',
      limit: null,
      action: { href: '/my/pull-requests/by-attempt/A_3', label: 'See the run' },
      row: 'stays',
    });
    expect(words({ refusal: 'AGENT_BUSY', value: 3 })).toMatchObject({
      text: '3 of your issues are being worked on, the most at a time. One more can start when a run ends.',
      action: { href: '/my/agent/runs', label: 'All runs' },
    });
  });

  it('draws the open pull request limit in its one notice', () => {
    expect(words({ refusal: 'LIMIT_REACHED', value: 3 })).toMatchObject({ text: null, limit: { count: 3, limit: 3 } });
  });

  it('offers the same Start again where waiting a little is all it takes', () => {
    for (const [refusal, text] of [
      ['CLAIM_PENDING', 'Your last Start is still being checked. Try again in a minute.'],
      ['TRY_LATER', "GitRanks can't start a run right now. Try again in a few minutes."],
    ] as const) {
      expect(words({ refusal })).toMatchObject({ text, action: { retry: true, label: 'Try again' }, row: 'stays' });
    }
    expect(ISSUE_START_FAILED).toMatchObject({
      text: 'Something went wrong. Try again in a minute.',
      action: { retry: true },
    });
  });

  it('says until when, with what a run can cost where known', () => {
    expect(words({ refusal: 'BUDGET', until: UNTIL }, { capUsd: 2 })).toMatchObject({
      text: 'Your budget leaves no room for one more run until Nov 21. A run can cost up to $2.',
      action: { href: '/my/agent/budget', label: 'Budget and pacing' },
    });
    expect(words({ refusal: 'BUDGET' })?.text).toBe('Your budget leaves no room for one more run.');
    expect(words({ refusal: 'KEY_WAITING', until: UNTIL }, { keyWaiting: 'EXHAUSTED' })).toMatchObject({
      text: 'Your Claude credits are used up until Nov 21.',
      action: { href: '/my/agent', label: 'Agent' },
    });
    // The page did not say which: a sentence true of both.
    expect(words({ refusal: 'KEY_WAITING', until: UNTIL })?.text).toBe("Your Claude key can't be used until Nov 21.");
    expect(words({ refusal: 'KEY_WAITING' })?.text).toBe("Your Claude key can't be used.");
    expect(words({ refusal: 'KEY_WAITING', until: UNTIL }, { keyWaiting: 'LIMIT_REACHED' })?.text).toBe(
      'Your Claude workspace reached its spend limit until Nov 21.',
    );
    expect(words({ refusal: 'DAILY_LIMIT' })).toMatchObject({
      text: "You've started as many issues as one day allows. You can start more after 00:00 UTC.",
      action: null,
    });
    expect(words({ refusal: 'PLATFORM_FULL' })).toMatchObject({
      text: 'GitRanks has started as many runs as it can today. You can start one after 00:00 UTC.',
      action: null,
    });
  });

  it('leads to the key, or to us', () => {
    expect(words({ refusal: 'KEY_INVALID' })).toMatchObject({
      text: 'Your Claude key stopped working. Nothing can start on it.',
      action: { href: '/my/agent/key?replace=1', label: 'Replace the key' },
    });
    expect(words({ refusal: 'NO_KEY' })).toMatchObject({
      text: 'The hosted agent needs a Claude key.',
      action: { href: '/my/agent/key', label: 'Add a key' },
    });
    expect(words({ refusal: 'ACCOUNT_PAUSED' })).toMatchObject({
      text: "This account can't start issues right now.",
      action: { href: 'mailto:hello@gitranks.com', label: 'Write to us', external: true },
    });
  });

  it('folds the row away for an issue that is gone, and keeps it without a control for a closed repo', () => {
    expect(words({ refusal: 'TAKEN' })).toMatchObject({ text: "Someone else's agent took this issue.", row: 'folds' });
    expect(words({ refusal: 'CLOSED' })).toMatchObject({ text: 'This issue was closed meanwhile.', row: 'folds' });
    expect(words({ refusal: 'UNAVAILABLE' })).toMatchObject({
      text: "This issue can't be started any more.",
      row: 'folds',
    });
    expect(words({ refusal: 'REPO_UNAVAILABLE' })).toMatchObject({
      text: "This project can't take a pull request from us right now.",
      row: 'no-control',
    });
  });
});
