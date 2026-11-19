import { describe, expect, it } from 'vitest';

import { startViewOf, startViews } from './start/__fixtures__/start-page';
import { startRefusalOf } from './start-refusals';

const BACK = { href: '/contribute/issues' as const, label: 'Issues for you' };
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

  it('links the lesson in progress, or My lessons when it was not read', () => {
    expect(words(startViews.ownInProgress)).toEqual({
      kind: 'notice',
      text: 'Your lesson on “Keep trailing comments when formatting match arms” is in progress. One lesson of your own at a time: this one can start once that one is done.',
      action: { href: '/my/pull-requests/by-attempt/A_3?view=lesson', label: 'Back to your lesson' },
    });
    expect(words(startViewOf({ refusal: 'OWN_IN_PROGRESS' }))).toEqual({
      kind: 'notice',
      text: 'Another lesson of yours is in progress. One lesson of your own at a time: this one can start once that one is done.',
      action: { href: '/learn/lessons', label: 'My lessons' },
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
