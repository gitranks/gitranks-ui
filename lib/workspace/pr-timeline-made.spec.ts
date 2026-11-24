import { describe, expect, it } from 'vitest';

import {
  autopilotTimeline,
  closedTimeline,
  learnTimeline,
  mergedTimeline,
  openTimeline,
  ownAgentTimeline,
  stoppedTimeline,
  unknownKindTimeline,
} from './__fixtures__/pr-timeline';
import type { PrTimeline } from './pr-timeline.types';
import {
  dayMonthOf,
  fixBylineOf,
  fixChangeOf,
  fixStatePillOf,
  helpedMoreOf,
  madeRowsOf,
  minutesWordsOf,
} from './pr-timeline-made';

const LONG_DASH = '—';
const rowsOf = (timeline: PrTimeline, questions: number | null = null) =>
  madeRowsOf(timeline, { questions }).map(({ label, date, text, note, dot }) => ({ label, date, text, note, dot }));

describe('madeRowsOf', () => {
  it('tells a merged pull request as the fix, the approval, its rounds and the merge', () => {
    expect(rowsOf(mergedTimeline)).toEqual([
      {
        label: 'Fix',
        date: '24 Oct',
        text: 'Claude (Opus), run by GitRanks, wrote the fix in 38 minutes.',
        note: 'Our checks passed: the project’s tests, and a new test that fails without the change.',
        dot: 'agent',
      },
      {
        label: 'Approved',
        date: '24 Oct',
        text: 'mira-dev read the change and sent it.',
        note: 'The pull request opened with 4 files.',
        dot: 'other',
      },
      {
        label: 'Round 1',
        date: '25 Oct',
        text: 'tomas-r asked for changes.',
        note: 'Answered the same day, with 1 commit and 1 reply.',
        dot: 'agent',
      },
      { label: 'Review', date: '26 Oct', text: 'tomas-r approved it.', note: null, dot: 'other' },
      {
        label: 'Merged',
        date: '26 Oct',
        text: 'Merged into driftwood-js/driftwood.',
        note: '2 days after the pull request opened.',
        dot: 'end',
      },
    ]);
  });

  it('adds the walkthrough of a Learn fix between the fix and the approval, with its questions when shown', () => {
    const rows = madeRowsOf(learnTimeline, { questions: 4 });
    expect(rows.map((row) => row.label)).toEqual(['Fix', 'Walkthrough', 'Approved', 'Round 1', 'Review', 'Merged']);
    expect(rows[1].text).toBe('mira-dev answered 4 questions about the change.');
    // A walkthrough held from the page: the row says only that it was passed.
    expect(madeRowsOf(learnTimeline)[1].text).toBe('mira-dev passed the walkthrough of the change.');
  });

  it('ends an open pull request with what it waits for', () => {
    expect(rowsOf(openTimeline).at(-1)).toEqual({
      label: 'Review',
      date: 'since 24 Oct',
      text: 'Waiting for the project’s maintainers.',
      note: 'Nobody from the project has answered yet.',
      dot: 'other',
    });
    const asked: PrTimeline = {
      ...openTimeline,
      milestones: [
        ...openTimeline.milestones,
        ...mergedTimeline.milestones.filter((row) => row.kind === 'REVIEWED').slice(0, 1),
      ],
    };
    expect(rowsOf(asked).at(-1)?.text).toBe('Waiting for mira-dev to answer the review.');
  });

  it('a stop, a close, the own agent, autopilot and failed checks', () => {
    expect(rowsOf(stoppedTimeline).at(-1)).toMatchObject({
      label: 'Stopped',
      text: 'A maintainer stopped GitRanks work on this pull request.',
      dot: 'stopped',
    });
    expect(rowsOf(closedTimeline).at(-1)).toMatchObject({
      label: 'Closed',
      text: 'tomas-r closed the pull request without merging it.',
      note: '6 days after the pull request opened.',
      dot: 'end',
    });
    expect(rowsOf(ownAgentTimeline)[0]).toMatchObject({
      text: 'Codex (GPT), mira-dev’s own agent, wrote the fix in 1 hour 11 minutes.',
      note: 'Our checks passed on the third try: the project’s tests.',
    });
    expect(rowsOf(autopilotTimeline)[0].note).toBe('Some of our checks failed.');
    expect(rowsOf(autopilotTimeline)[1]).toMatchObject({
      label: 'Sent',
      text: 'mira-dev’s autopilot sent it: no person read the change first.',
    });
  });

  it('leaves out a kind it does not know, and every word is free of the long dash', () => {
    expect(rowsOf(unknownKindTimeline)).toEqual(rowsOf(mergedTimeline));
    for (const timeline of [mergedTimeline, openTimeline, closedTimeline, stoppedTimeline, autopilotTimeline]) {
      expect(JSON.stringify(madeRowsOf(timeline))).not.toContain(LONG_DASH);
    }
  });
});

describe('the issue card and the change', () => {
  it('pills the state with its day', () => {
    expect(fixStatePillOf(mergedTimeline)).toEqual({ text: 'merged 26 Oct', tone: 'positive' });
    expect(fixStatePillOf(openTimeline)).toEqual({ text: 'open since 24 Oct', tone: 'brand' });
    expect(fixStatePillOf(closedTimeline)).toEqual({ text: 'closed 30 Oct', tone: 'muted' });
  });

  it('words who made it: a Learn fix by its state, a Contribute pull request by its approval', () => {
    expect(fixBylineOf(mergedTimeline, 'LEARN', 'Claude Code')).toEqual({
      before: 'Fixed by',
      login: 'mira-dev',
      after: 'with Claude (Opus), run by GitRanks.',
    });
    expect(fixBylineOf({ ...openTimeline, ownAgent: true, agentPhrase: 'Codex (GPT)' }, 'LEARN').after).toBe(
      'with their own agent, Codex (GPT). The project has not merged it yet.',
    );
    expect(fixBylineOf(closedTimeline, 'LEARN').after).toBe(
      'with Claude (Opus), run by GitRanks. The project closed it without merging.',
    );
    expect(fixBylineOf(mergedTimeline, 'CONTRIBUTE')).toEqual({
      before: 'Made with GitRanks Contribute, powered by Claude (Opus).',
      login: 'mira-dev',
      after: 'reviewed and submitted it.',
    });
    expect(fixBylineOf(autopilotTimeline, 'CONTRIBUTE').after).toBe(
      '’s autopilot sent it: no person read the change first.',
    );
  });

  it('names the agent the Fix row names, never one the pull request was not made with', () => {
    // The contributor's own agent: the card and the Fix row say the same.
    const own = { ...ownAgentTimeline, agentPhrase: 'GitRanks Contribute and Codex (GPT)' };
    expect(fixBylineOf(own, 'CONTRIBUTE').before).toBe('Made with GitRanks Contribute and Codex (GPT).');
    expect(rowsOf(own)[0].text).toMatch(/^Codex \(GPT\), mira-dev’s own agent, wrote the fix/);
    expect(JSON.stringify(fixBylineOf(own, 'CONTRIBUTE'))).not.toContain('Claude');
    // The fix's own name for the agent only when the timeline never said; with neither, none is named.
    expect(fixBylineOf({ ...own, agentPhrase: '' }, 'LEARN', 'Claude Code').after).toBe(
      'with their own agent, Claude Code. The project has not merged it yet.',
    );
    expect(fixBylineOf({ ...own, agentPhrase: '' }, 'CONTRIBUTE').before).toBe('Made with GitRanks Contribute.');
    expect(fixBylineOf({ ...own, agentPhrase: '' }, 'LEARN').after).toBe(
      'with their own agent. The project has not merged it yet.',
    );
    expect(rowsOf({ ...own, agentPhrase: '' })[0].text).toMatch(/^mira-dev’s own agent wrote the fix/);
  });

  it("gives the change the agent's own words, its numbers and the diff", () => {
    expect(fixChangeOf(mergedTimeline)).toEqual({
      text: 'Layout lookups used the raw route path as the cache key. It now normalizes the path first.',
      pills: ['4 files', '30 lines added', '15 removed', '1 test added'],
      diffUrl: `${mergedTimeline.url}/files`,
    });
  });

  it('counts the people named beyond those shown', () => {
    expect(helpedMoreOf({ names: ['a', 'b'], named: 5 })).toBe('+3 more');
    expect(helpedMoreOf({ names: ['a', 'b'], named: 2 })).toBeNull();
  });

  it('writes days and minutes in plain words', () => {
    expect(dayMonthOf('2026-12-01T23:30:00.000Z')).toBe('1 Dec');
    expect(minutesWordsOf(1)).toBe('1 minute');
    expect(minutesWordsOf(120)).toBe('2 hours');
  });
});
