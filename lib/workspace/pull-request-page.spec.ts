import { describe, expect, it } from 'vitest';

import {
  PR_NOW,
  prAsk,
  prAsks,
  prChecks,
  prContribute,
  prEnds,
  prOnlyYouPage,
  prPage,
  prReview,
  prRound,
  prRoundReady,
  prStages,
} from './__fixtures__/pull-request';
import {
  askedSummaryOf,
  boxOf,
  changeCardOf,
  checkChipsOf,
  notNeededLineOf,
  onDayOf,
  onlyYouWordsOf,
  openingStepOf,
  roundAskTitleOf,
  sendRoundLabelOf,
  sentRoundMarkOf,
  stripOf,
  walkthroughCardOf,
} from './pull-request-page';
import type { PullRequestPage } from './pull-request-page.types';

const box = (page: PullRequestPage, opts: { agent?: string | null; retryLabel?: string | null } = {}) =>
  boxOf(page, { now: PR_NOW, ...opts });
const ids = (page: PullRequestPage) => box(page).actions.map((action) => action.id);

describe('the strip', () => {
  it('checks what is done, marks the current stage and turns its ring while work goes on', () => {
    expect(stripOf(prStages.fixing).map((step) => [step.label, step.state, step.working])).toEqual([
      ['Fix', 'current', true],
      ['Walkthrough', 'todo', false],
      ['Approve', 'todo', false],
      ['Review', 'todo', false],
      ['Merged', 'todo', false],
    ]);
    expect(stripOf(prStages.walkthrough).map((step) => step.state)).toEqual([
      'done',
      'current',
      'todo',
      'todo',
      'todo',
    ]);
  });

  it('checks every stage once merged, and greys the stage an ended pull request stopped at', () => {
    expect(stripOf(prStages.merged).every((step) => step.state === 'done')).toBe(true);
    expect(stripOf(prEnds.closed).map((step) => step.state)).toEqual(['done', 'done', 'done', 'stopped', 'todo']);
    expect(stripOf(prEnds.stoppedEarly)[0].state).toBe('stopped');
  });

  it("has Contribute's four stages", () => {
    expect(stripOf(prContribute.asked).map((step) => `${step.n} ${step.label}`)).toEqual([
      '1 Fix',
      '2 Approve',
      '3 Review',
      '4 Merged',
    ]);
  });
});

describe('days', () => {
  it('says today, or the day in UTC', () => {
    expect(onDayOf('2026-10-28T00:10:00.000Z', PR_NOW)).toBe('today');
    expect(onDayOf('2026-10-21T09:00:00.000Z', PR_NOW)).toBe('on 21 Oct');
    expect(onDayOf(null, PR_NOW)).toBe('');
    expect(onDayOf('not a date', PR_NOW)).toBe('');
  });
});

describe('what a round was asked', () => {
  it('counts a review, comments, each bot and the failing checks', () => {
    expect(askedSummaryOf(prAsks)).toBe('A review asking for changes, 1 comment, 5 from CodeRabbit, 1 failing check');
    expect(roundAskTitleOf(prRound())).toBe(
      'Round 2: a review, a comment, 5 from CodeRabbit and 1 failing check to answer',
    );
  });

  it('counts more than one of a kind, and things it has no words for', () => {
    const asked = [
      prAsk(),
      prAsk({ id: 'b' }),
      prAsk({ kind: 'comment', id: 'c' }),
      prAsk({ kind: 'comment', id: 'd' }),
      prAsk({ kind: 'something_new', id: 'e' }),
    ];
    expect(askedSummaryOf(asked)).toBe('2 reviews asking for changes, 2 comments, 1 other request');
    expect(roundAskTitleOf({ n: 3, asked })).toBe('Round 3: 2 reviews, 2 comments and 1 other request to answer');
    expect(roundAskTitleOf({ n: 3, asked: [] })).toBe('Round 3 has something to answer');
  });
});

describe('sending a round', () => {
  it('counts only the replies that will be posted', () => {
    expect(sendRoundLabelOf(prRoundReady)).toBe('Send round 2: 2 commits and 8 replies');
    expect(sendRoundLabelOf({ n: 4, commits: 1, replies: [] })).toBe('Send round 4: 1 commit');
    expect(sendRoundLabelOf({ n: 4, commits: null, replies: [] })).toBe('Send round 4');
  });

  it('marks the newest sent round as with the maintainers, and as merged after a merge', () => {
    const round = prReview.sent.rounds[0];
    expect(sentRoundMarkOf(round, prReview.sent)).toBe('With the maintainers');
    expect(sentRoundMarkOf(round, prEnds.merged)).toBe('Merged');
    expect(sentRoundMarkOf(prReview.sent.rounds[1], prReview.sent)).toBe('Done');
  });

  it('says why a round was marked as not needed', () => {
    expect(notNeededLineOf('FAILS_ON_BASE')).toBe(
      'You marked it as not needed: the checks fail on the main branch too.',
    );
    expect(notNeededLineOf(null)).toBe('You marked it as not needed.');
  });
});

describe('the checks line', () => {
  it('has four counts, each left out when zero or not known', () => {
    expect(checkChipsOf(prChecks).map((chip) => chip.text)).toEqual([
      '11 pass',
      '1 your agent can fix',
      '1 needs you',
      '3 not yours to fix',
    ]);
    expect(checkChipsOf({ pass: 12, agentCanFix: 0, needsYou: null, notYours: 2, rows: [] }).map((c) => c.key)).toEqual(
      ['pass', 'NOT_YOURS'],
    );
  });
});

describe('the two cards', () => {
  it('draws the change quiet until it is written', () => {
    expect(changeCardOf(prStages.fixing)).toEqual({ text: 'Not written yet.', link: false, quiet: true });
    expect(changeCardOf(prStages.walkthrough)).toEqual({
      text: '4 files changed: 86 lines added, 12 removed.',
      link: true,
      quiet: false,
    });
  });

  it('follows the walkthrough from written to shared', () => {
    const card = (page: PullRequestPage) => walkthroughCardOf(page, PR_NOW).text;
    expect(card(prStages.fixing)).toBe('Written after the fix.');
    expect(card(prStages.writing)).toBe('Being written.');
    expect(card(prStages.walkthrough)).toBe('4 questions, not started.');
    expect(card(prStages.partly)).toBe('2 of 4 questions answered.');
    expect(card(prStages.approve)).toBe('Passed today. Private until the pull request opens.');
    expect(card(prStages.open)).toBe('Passed on 21 Oct. 3 people read it. Your answers are shared.');
    expect(walkthroughCardOf(prStages.open, PR_NOW).link).toBe(true);
  });
});

describe('the box', () => {
  it('names the agent at work, and needs nothing', () => {
    expect(box(prStages.fixing, { agent: 'Claude Code' }).title).toBe('Claude Code is fixing the issue');
    expect(box(prStages.fixing).title).toBe('Your agent is fixing the issue');
    expect(box(prContribute.fixing).title).toBe('The hosted agent is fixing the issue');
    expect(box(prStages.fixing).actions).toEqual([]);
    expect(box(prStages.fixing).note).toContain('Nothing is needed from you');
    expect(box(prStages.writing).title).toBe('The fix is ready. Your agent is writing its walkthrough');
    expect(box(prStages.rewriting).title).toBe('Your agent is rewriting the walkthrough');
  });

  it('starts or continues the walkthrough', () => {
    expect(box(prStages.walkthrough)).toMatchObject({
      title: 'Answer 4 questions about the fix',
      actions: [{ id: 'walkthrough', label: 'Start the walkthrough' }],
    });
    expect(box(prStages.partly).text).toBe('You answered 2 of 4. After them, the pull request is yours to approve.');
    expect(box(prStages.partly).actions[0].label).toBe('Continue the walkthrough');
  });

  it('opens Approve, and shows the opening in five parts', () => {
    expect(box(prStages.approve)).toMatchObject({
      title: 'Read the change and open the pull request',
      actions: [{ id: 'approve', label: 'Write the pull request' }],
    });
    expect(box(prStages.approve).text).toMatch(/^You finished the walkthrough today\./);
    expect(box(prStages.opening).title).toBe('Opening your pull request');
    expect(ids(prStages.opening)).toEqual(['veto']);
    expect(openingStepOf(4).line).toBe('Step 4 of 5 · sending your change to GitHub');
    expect(openingStepOf(null).step).toBe(1);
    expect(openingStepOf(9).step).toBe(5);
  });

  it('offers the lesson after an open or merged Learn pull request, and a similar issue without one', () => {
    expect(ids(prStages.open)).toEqual(['lessonQuestions', 'lessonIssues', 'course']);
    expect(ids(prPage({ ...prStages.open, lessonToAsk: false }))).toEqual(['lessonIssues', 'course']);
    expect(ids(prStages.noLessonMerged)).toEqual(['similar', 'issues']);
    expect(box(prStages.merged).title).toBe('Merged. Your code is in harbor-kit/relay');
    expect(box(prEnds.merged).title).toBe('Merged after 2 rounds. Your code is in harbor-kit/relay');
  });

  it('gives a waiting round the prompt for an own agent, and a button for a hosted one', () => {
    expect(box(prReview.asked, { agent: 'Claude Code' })).toMatchObject({
      title: 'Round 2: a review, a comment, 5 from CodeRabbit and 1 failing check to answer',
      prompt: 'Do round 2 of https://github.com/harbor-kit/relay/pull/58 with GitRanks',
      actions: [],
    });
    expect(box(prReview.asked, { agent: 'Claude Code' }).text).toMatch(/^Paste this in Claude Code\./);
    expect(box(prContribute.asked)).toMatchObject({
      prompt: null,
      actions: [{ id: 'startRound', label: 'Start round 2' }],
    });
  });

  it('sends a ready round as a whole, or sends it back', () => {
    expect(box(prReview.ready)).toMatchObject({
      title: 'Round 2 is ready: read it, then send it',
      actions: [
        { id: 'sendRound', label: 'Send round 2: 2 commits and 8 replies' },
        { id: 'sendBack', label: 'Send it back to your agent' },
      ],
    });
    expect(box(prReview.ready).text).toContain('made 2 commits and drafted 9 replies, and you left 1 out');
    expect(box(prReview.working).title).toBe('Your agent is working on round 2');
  });

  it('waits for the maintainers with nothing to do', () => {
    expect(box(prReview.sent)).toMatchObject({
      title: 'Round 2 is sent. Waiting for the maintainers',
      note: 'Nothing is needed from you.',
      actions: [],
    });
    expect(box(prReview.sent).text).toContain('went to the same pull request today');
  });

  it('puts one thing only the person can do in the box, with its own action', () => {
    expect(box(prOnlyYouPage('cla'))).toMatchObject({
      title: 'Sign the project’s agreement',
      actions: [{ id: 'onlyYou', label: 'Sign it on GitHub', url: 'https://cla.example.org/harbor-kit/relay' }],
    });
    expect(ids(prOnlyYouPage('dco'))).toEqual(['onlyYou', 'onlyYouAlt']);
    expect(box(prOnlyYouPage('replies_failed')).actions.map((action) => action.label)).toEqual([
      'Post them as one comment',
      'Try again',
    ]);
    expect(onlyYouWordsOf({ kind: 'brand_new', url: null })).toMatchObject({
      title: 'Only you can do this',
      action: null,
    });
  });

  it('ends quietly, with one way on', () => {
    expect(box(prEnds.closed)).toMatchObject({
      quiet: true,
      title: 'Closed without merging',
      textLink: { label: 'See it on GitHub', url: 'https://github.com/harbor-kit/relay/pull/58' },
      actions: [{ id: 'issues', label: 'Back to Issues' }],
    });
    expect(box(prEnds.closed).text).toContain('The walkthrough you finished stays in your progress.');
    expect(box(prEnds.stopped).title).toBe('GitRanks work on this pull request stopped');
    expect(box(prEnds.stoppedEarly)).toMatchObject({
      title: 'The agent stopped before a pull request',
      actions: [{ id: 'retry', label: 'Try again' }, { id: 'issues' }],
    });
    expect(box(prEnds.stoppedEarly, { retryLabel: 'Retry with a budget of $4.00' }).actions[0].label).toBe(
      'Retry with a budget of $4.00',
    );
    expect(box(prEnds.discarded)).toMatchObject({ quiet: true, title: 'You discarded this fix' });
  });

  it('never says lesson for a fix with no lesson', () => {
    for (const page of [prStages.noLesson, prStages.noLessonMerged]) {
      const words = box(page);
      expect(JSON.stringify(words)).not.toMatch(/lesson/i);
    }
  });

  it('has no long dash in any words it shows', () => {
    const pages = [
      ...Object.values(prStages),
      ...Object.values(prReview),
      ...Object.values(prEnds),
      ...Object.values(prContribute),
      ...['cla', 'dco', 'conversation', 'title', 'github', 'bot_blocked', 'replies_failed'].map(prOnlyYouPage),
    ];
    for (const page of pages) expect(JSON.stringify(box(page))).not.toContain('—');
  });
});
