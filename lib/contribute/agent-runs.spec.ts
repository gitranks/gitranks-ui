import { describe, expect, it } from 'vitest';

import { activityOf, FOLLOW_UP, QUEUED, READY, runOf, WORKING } from './__fixtures__/agent-runs';
import {
  durationLabel,
  eventLineOf,
  indicatorLabelOf,
  laneRunsOf,
  newerActivity,
  phaseTextOf,
  runLinkOf,
  runsTabMarkOf,
  spendLabelOf,
  stepsOf,
} from './agent-runs';

describe('the agent runs', () => {
  it('says in the header what works, else what waits, else how the latest one ended', () => {
    expect(indicatorLabelOf([WORKING])).toBe('1 agent working');
    expect(indicatorLabelOf([WORKING, FOLLOW_UP, QUEUED, READY])).toBe('2 agents working');
    expect(indicatorLabelOf([QUEUED])).toBe('1 queued');
    expect(indicatorLabelOf([QUEUED, runOf({ phase: 'WAITING_FOR_YOU', active: false })])).toBe('Waiting for you');
    expect(indicatorLabelOf([runOf({ runner: 'MCP', active: false })])).toBe('1 in progress');
    const done = runOf({ phase: 'DONE', active: false, settledAt: '2026-10-31T11:59:00.000Z' });
    expect(indicatorLabelOf([READY, done])).toBe('Done');
    expect(indicatorLabelOf([])).toBe('');
  });

  it('marks the robot tab with how many work, else how many wait, and nothing for settled runs', () => {
    expect(runsTabMarkOf([WORKING, FOLLOW_UP, QUEUED, READY])).toEqual({
      working: 2,
      waiting: 0,
      label: '2 agents working',
    });
    expect(runsTabMarkOf([QUEUED])).toEqual({ working: 0, waiting: 1, label: '1 queued' });
    expect(runsTabMarkOf([READY])).toEqual({ working: 0, waiting: 0, label: '' });
    expect(runsTabMarkOf([])).toEqual({ working: 0, waiting: 0, label: '' });
  });

  it("splits Right now's runs by lane, the ones that wait for the user left to Needs you", () => {
    const own = runOf({ attemptId: 'att_own', runner: 'MCP' });
    const autopilot = runOf({ attemptId: 'att_autopilot', phase: 'WAITING_FOR_YOU', active: false });
    const done = runOf({ attemptId: 'att_done', phase: 'DONE', active: false });
    const stopped = runOf({ attemptId: 'att_stopped', phase: 'STOPPED', active: false });
    const lanes = laneRunsOf([WORKING, FOLLOW_UP, QUEUED, own, autopilot, READY, done, stopped]);
    expect(lanes.hosted.map(({ attemptId }) => attemptId)).toEqual(['att_working', 'att_follow_up', 'att_queued']);
    expect(lanes.own.map(({ attemptId }) => attemptId)).toEqual(['att_own']);
    expect(lanes.finished.map(({ attemptId }) => attemptId)).toEqual(['att_done', 'att_stopped']);
  });

  it('words a settled run as the user acts on it, a live one as the API says', () => {
    expect(phaseTextOf(READY)).toBe('Ready for you');
    expect(phaseTextOf(runOf({ phase: 'STOPPED', label: 'Stopped' }))).toBe('Stopped');
    expect(phaseTextOf(QUEUED)).toBe('Queued, 1st in line');
  });

  it('places each phase on its kind’s steps', () => {
    expect(stepsOf(WORKING)).toEqual({ steps: ['Queued', 'Checking the issue', 'Working', 'Checks', 'Ready'], at: 2 });
    expect(stepsOf(runOf({ phase: 'RUNNING_CHECKS' })).at).toBe(3);
    expect(stepsOf(READY).at).toBe(4);
    expect(stepsOf(FOLLOW_UP)).toEqual({ steps: ['Queued', 'Addressing review', 'Checks', 'Ready', 'Pushed'], at: 1 });
    expect(stepsOf(runOf({ kind: 'FOLLOW_UP', phase: 'SUBMITTING' })).at).toBe(4);
    expect(stepsOf(runOf({ phase: 'SUBMITTING' })).at).toBe(4);
  });

  it('says how long in a few words', () => {
    expect(durationLabel(42)).toBe('42 s');
    expect(durationLabel(12 * 60 + 30)).toBe('12 min');
    expect(durationLabel(65 * 60)).toBe('1 h 05 min');
  });

  it('shows a hosted run’s spend against its cap, none for the user’s own agent', () => {
    expect(spendLabelOf(WORKING)).toBe('$0.42 of $2');
    expect(spendLabelOf(runOf({ spendUsd: 0.4049 }))).toBe('$0.40 of $2');
    expect(spendLabelOf(runOf({ runner: 'MCP', spendUsd: null, budgetUsd: null }))).toBeNull();
    expect(spendLabelOf(QUEUED)).toBeNull();
  });

  it('words the latest event as the timeline does, a fixed code as words', () => {
    expect(eventLineOf(WORKING)).toBe('go: budget raised to $1.80, the work sent');
    expect(eventLineOf(READY)).toBe('Waiting for your review');
    expect(eventLineOf(QUEUED)).toBe('Picked for you');
    expect(eventLineOf(FOLLOW_UP)).toBe('work on $0.90');
    const queuedBy = (detail: string | null) => runOf({ latestEvent: { state: 'QUEUED', detail, at: '' } });
    expect(eventLineOf(queuedBy('follow_up: user'))).toBe('Follow-up you started');
    expect(eventLineOf(queuedBy(null))).toBe('Queued');
    expect(eventLineOf(runOf({ latestEvent: null }))).toBeNull();
  });

  it('leads to the review once ready, to the attempt otherwise', () => {
    expect(runLinkOf(READY)).toEqual({ href: '/contribute/attempts/att_ready', label: 'Review' });
    expect(runLinkOf(WORKING)).toEqual({ href: '/contribute/attempts/att_working', label: 'Details' });
    expect(runLinkOf(runOf({ phase: 'DONE' })).label).toBe('See it');
  });

  it('takes the poll’s read once it is as new as the page’s', () => {
    const page = activityOf(WORKING);
    const older = { ...activityOf(), readAt: '2026-10-31T11:59:00.000Z' };
    const newer = { ...activityOf(READY), readAt: '2026-10-31T12:00:10.000Z' };
    expect(newerActivity(page, null)).toBe(page);
    expect(newerActivity(page, older)).toBe(page);
    expect(newerActivity(page, newer)).toBe(newer);
    expect(newerActivity(null, newer)).toBe(newer);
  });
});
