import { describe, expect, it } from 'vitest';

import { PR_NOW, prLists, prRow, prRowsContribute, prRowsEvery } from './__fixtures__/pull-request';
import { costOf, groupsOf, LIST_PLACE, limitLineOf, needsYouRowWordsOf, rowWordsOf } from './pull-request-list';
import type { PullRequestBox } from './pull-request-page.types';

describe('the groups', () => {
  it('puts each box in one group with one mark', () => {
    const byGroup = (group: string) =>
      (Object.keys(LIST_PLACE) as PullRequestBox[]).filter((box) => LIST_PLACE[box].group === group);
    expect(byGroup('NEEDS_YOU')).toEqual(['WALKTHROUGH', 'APPROVE', 'ONLY_YOU', 'ROUND_WAITING', 'ROUND_READY']);
    expect(byGroup('IN_PROGRESS')).toEqual([
      'FIXING',
      'WRITING_WALKTHROUGH',
      'REWRITING_WALKTHROUGH',
      'ROUND_WORKING',
      'OPENING',
      'OPEN',
      'WITH_MAINTAINERS',
    ]);
    expect(LIST_PLACE.OPEN.mark).toBe('MAINTAINERS');
    expect(LIST_PLACE.OPENING.mark).toBe('AGENT_WORKING');
    expect(LIST_PLACE.MERGED).toEqual({ group: 'ENDED', mark: 'MERGED' });
    expect(LIST_PLACE.DISCARDED).toEqual({ group: 'ENDED', mark: null });
  });

  it('draws the groups in order, each row once, and leaves out a group with nothing in it', () => {
    expect(groupsOf(prRowsContribute).map((group) => [group.title, group.rows.length])).toEqual([
      ['Needs you', 3],
      ['In progress', 2],
      ['Ended', 4],
    ]);
    expect(groupsOf([prRow('OPEN')]).map((group) => group.title)).toEqual(['In progress']);
    expect(groupsOf([])).toEqual([]);
  });
});

describe('a row', () => {
  const words = (index: number) => rowWordsOf(prRowsEvery[index], PR_NOW);

  it("says what is the person's move, and what its button does", () => {
    expect(words(0)).toMatchObject({ line: 'The fix walkthrough is ready', button: 'Start the walkthrough' });
    expect(words(1)).toMatchObject({ line: 'Ready to open the pull request', button: 'Read and approve' });
    expect(words(2)).toMatchObject({ line: 'Only you can do this', button: 'See what to do' });
    expect(words(3)).toMatchObject({
      line: 'Round 2: something to answer',
      button: 'See what was asked',
      agent: 'Hosted agent',
      cost: '$3.12',
    });
    expect(words(4)).toMatchObject({
      line: 'Round 2 is ready: your agent made the change',
      button: 'Read and approve',
    });
  });

  it('names the agent at work once, with when it started', () => {
    expect(words(5)).toMatchObject({
      line: 'Claude Code is fixing the issue',
      when: 'Started 1 hour ago',
      agent: null,
      button: 'Open',
    });
    expect(words(6).line).toBe('Claude Code is writing the walkthrough');
    expect(words(7)).toMatchObject({ line: 'The hosted agent is fixing the issue', agent: null, cost: '$0.40' });
  });

  it('says who has the next move once the pull request is open', () => {
    expect(words(8)).toMatchObject({ line: 'Pull request open · waiting for a maintainer', when: 'Opened 25 Oct' });
    expect(words(9)).toMatchObject({ line: 'Round 3 is sent · waiting for the maintainers', when: 'Sent today' });
  });

  it('says how it ended', () => {
    expect(words(10).line).toBe('Merged on 23 Oct');
    expect(words(11).line).toBe('Closed without merging on 19 Oct');
    expect(words(12).line).toBe('Stopped before a pull request');
    expect(words(13).line).toBe('You discarded this fix before a pull request');
  });

  it('writes a cost with cents', () => {
    expect(costOf(0.4)).toBe('$0.40');
    expect(costOf(12)).toBe('$12.00');
  });
});

describe('the line about the limit', () => {
  it('says how many are open, and at the limit what that means', () => {
    expect(limitLineOf(prLists.contribute)).toBe('3 of 8 open at a time');
    expect(limitLineOf(prLists.atLimit)).toBe('8 of 8 open: no new fix can start until one is merged or closed.');
  });
});

describe('needsYouRowWordsOf', () => {
  it('words each box that needs the person, and nothing for the others', () => {
    expect(needsYouRowWordsOf({ box: 'ROUND_WAITING', round: 2 })).toEqual({
      line: 'Round 2: something to answer',
      button: 'See what was asked',
    });
    expect(needsYouRowWordsOf({ box: 'APPROVE', round: null })?.line).toBe('Ready to open the pull request');
    expect(needsYouRowWordsOf({ box: 'ROUND_READY', round: null })?.line).toBe(
      'Round 1 is ready: your agent made the change',
    );
    expect(needsYouRowWordsOf({ box: 'OPEN', round: null })).toBeNull();
  });
});
