import { describe, expect, it } from 'vitest';

import {
  autopilotTimeline,
  closedTimeline,
  mergedTimeline,
  openTimeline,
  ownAgentTimeline,
  unknownKindTimeline,
} from './__fixtures__/pr-timeline';
import type { PrTimelineMilestone } from './pr-timeline.types';
import {
  dayHeadingOf,
  durationOf,
  factsOf,
  milestoneWordsOf,
  openedLineOf,
  PLAIN_ROW_TITLE,
  timeOf,
} from './pr-timeline-words';

const rowOf = (kind: PrTimelineMilestone['kind'], timeline = mergedTimeline) =>
  timeline.milestones.find((row) => row.kind === kind) as PrTimelineMilestone;

describe('milestoneWordsOf', () => {
  it('words each kind from its fields; the agent’s text only on agent rows', () => {
    expect(milestoneWordsOf(rowOf('WORKED'), mergedTimeline)).toMatchObject({
      title: 'Wrote the fix',
      actor: 'Agent',
      agent: true,
      pills: ['38 min', '3 files', '+24 −6', '1 test added'],
    });
    expect(milestoneWordsOf(rowOf('CHECKS'), mergedTimeline)).toMatchObject({
      title: 'Our checks passed',
      text: 'A new test fails without the fix and passes with it.',
    });
    expect(milestoneWordsOf(rowOf('APPROVED'), mergedTimeline).title).toBe(
      'mira-dev reviewed the change and approved it',
    );
    expect(milestoneWordsOf(rowOf('REVIEWED'), mergedTimeline).title).toBe('tomas-r asked for changes');
    expect(milestoneWordsOf(rowOf('PUSHED'), mergedTimeline).title).toBe('Pushed 1 commit and posted 1 reply');
    expect(milestoneWordsOf(rowOf('OPENED'), mergedTimeline).titleLink?.href).toBe(mergedTimeline.url);
    expect(milestoneWordsOf(rowOf('CLOSED', closedTimeline), closedTimeline).title).toBe('Closed by tomas-r');
  });

  it('an overridden check names the contributor’s choice, never a reason', () => {
    const row = { ...rowOf('CHECKED'), overridden: true, text: null };
    expect(milestoneWordsOf(row, mergedTimeline).text).toBe(
      'The agent advised against it; mira-dev chose to go ahead.',
    );
  });

  it('autopilot and failed checks say so', () => {
    expect(milestoneWordsOf(rowOf('APPROVED', autopilotTimeline), autopilotTimeline).title).toBe(
      'mira-dev’s autopilot approved it, unreviewed',
    );
    expect(milestoneWordsOf(rowOf('CHECKS', autopilotTimeline), autopilotTimeline).title).toBe(
      'Some of our checks failed',
    );
    expect(openedLineOf(autopilotTimeline)).toBe('opened Oct 24 by mira-dev’s autopilot, not reviewed by a person');
  });

  it('words a kind it does not know as a plain row: the title and the actor, no text or numbers', () => {
    const row = unknownKindTimeline.milestones.find((each) => (each.kind as string) === 'WALKTHROUGH');
    expect(row).toBeDefined();
    expect(milestoneWordsOf(row as PrTimelineMilestone, unknownKindTimeline)).toEqual({
      title: PLAIN_ROW_TITLE,
      actor: 'Agent',
      agent: true,
      text: null,
      pills: [],
    });
    // An actor it does not know either: no badge.
    const stranger = { ...(row as PrTimelineMilestone), by: 'ROBOT' as PrTimelineMilestone['by'] };
    expect(milestoneWordsOf(stranger, unknownKindTimeline)).toMatchObject({ actor: null, agent: false });
  });

  it('leaves a row of a kind it does not know out of the facts', () => {
    expect(factsOf(unknownKindTimeline)).toEqual(factsOf(mergedTimeline));
  });
});

describe('factsOf', () => {
  it('sums the agent’s minutes and runs, counts rounds, and spans opened to merged', () => {
    expect(factsOf(mergedTimeline).map(({ label, value, note }) => [label, value, note])).toEqual([
      ['Agent', 'Claude (Opus)', 'run by GitRanks'],
      ['Agent work', '53 min', '2 runs'],
      ['Our checks', 'Passed', null],
      ['Review rounds', '1', '2 maintainer reviews'],
      ['Opened to merged', '2 days', 'Oct 24 to Oct 26'],
    ]);
  });

  it('an own agent’s tries, an open PR, a closed one', () => {
    expect(factsOf(ownAgentTimeline)[2]).toEqual({ label: 'Our checks', value: 'Passed', note: 'after 3 tries' });
    expect(factsOf(openTimeline)[4]).toEqual({ label: 'Open', value: 'Since Oct 24', note: null });
    expect(factsOf(closedTimeline)[4]).toMatchObject({ label: 'Opened to closed', value: '6 days' });
  });
});

describe('dates and times', () => {
  it('are UTC', () => {
    expect(dayHeadingOf('2026-10-24T23:30:00.000Z')).toBe('Sat, Oct 24');
    expect(timeOf('2026-10-24T09:05:00.000Z')).toBe('09:05');
    expect(durationOf(125)).toBe('2 h 5 min');
  });
});
