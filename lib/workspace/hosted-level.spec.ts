import { describe, expect, it } from 'vitest';

import { autopilotChoiceOf, type LevelPicking, levelPickStep, nextIssueLineOf, paceSaveOf } from './hosted-level';
import { contributor, limits, NOW, settings } from '@/lib/contribute/__fixtures__/contribute-views';

const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
const facts = (nextAttemptAt: string | null, prBound = 0) => ({
  spend: { nextAttemptAt },
  counts: { prBound },
  settings,
  limits: limits.standard,
});

describe('when the hosted agent starts its next issue by itself', () => {
  it('says nothing at "You start each issue", or while the spend is not known', () => {
    expect(nextIssueLineOf('MANUAL', facts(at(180)), NOW)).toBeNull();
    expect(nextIssueLineOf('NEXT', { ...facts(at(180)), spend: null }, NOW)).toBeNull();
  });

  it('waits for Resume while the user paused, and says nothing while a refused key pauses it', () => {
    expect(nextIssueLineOf('NEXT', { ...facts(at(180)), paused: 'you' }, NOW)).toBe('Next issue: after you resume');
    expect(nextIssueLineOf('AUTOPILOT', { ...facts(at(180), 3), paused: 'you' }, NOW)).toBe(
      'Next issue: after you resume',
    );
    expect(nextIssueLineOf('NEXT', { ...facts(at(180)), paused: 'key' }, NOW)).toBeNull();
    expect(nextIssueLineOf('MANUAL', { ...facts(at(180)), paused: 'you' }, NOW)).toBeNull();
  });

  it('waits on a pull request once the open ones reach the limit, before anything else', () => {
    expect(nextIssueLineOf('NEXT', facts(at(180), 3), NOW)).toBe('Next issue: when a pull request is merged or closed');
    expect(nextIssueLineOf('AUTOPILOT', facts(null, 3), NOW)).toBe(
      'Next issue: when a pull request is merged or closed',
    );
    // A limit set for the account holds over the setting.
    expect(nextIssueLineOf('NEXT', { ...facts(at(180), 3), limits: limits.openPrsSet }, NOW)).toBe(
      'Next issue: in about 3 hours',
    );
  });

  it('says the budget leaves no room, soon, or in about how long', () => {
    expect(nextIssueLineOf('NEXT', facts(null), NOW)).toBe('Next issue: your budget leaves no room for a run');
    expect(nextIssueLineOf('NEXT', facts(at(-20)), NOW)).toBe('Next issue: within a few minutes, when one fits you');
    expect(nextIssueLineOf('NEXT', facts(at(5)), NOW)).toBe('Next issue: within a few minutes, when one fits you');
    expect(nextIssueLineOf('NEXT', facts(at(180)), NOW)).toBe('Next issue: in about 3 hours');
    expect(nextIssueLineOf('AUTOPILOT', facts(at(40)), NOW)).toBe('Next issue: in about 40 minutes');
  });
});

describe('the Autopilot card', () => {
  const { autopilot } = contributor();

  it('is locked until 5 merged, saying how many so far, and since a lock', () => {
    const open = { ...autopilot, available: true, noticeTo: 'm•••@gmail.com' };
    expect(autopilotChoiceOf(open, 'MANUAL')).toEqual({
      pill: 'After 5 merged pull requests · 1 of 5',
      noEmail: false,
      canChoose: false,
      lockedAfterChosen: false,
    });
    expect(autopilotChoiceOf({ ...open, mergedToUnlock: 4, lockedAt: '2026-10-20T08:00:00.000Z' }, 'NEXT').pill).toBe(
      'Locked on Oct 20 · 1 of 5 merged since',
    );
  });

  it('says after launch month while it is not open, or not known to be', () => {
    expect(autopilotChoiceOf({ ...autopilot, unlocked: true, available: false }, 'NEXT')).toMatchObject({
      pill: 'After launch month',
      canChoose: false,
    });
    expect(autopilotChoiceOf({ ...autopilot, unlocked: true }, 'NEXT').pill).toBe('After launch month');
  });

  it('can be chosen once open and unlocked with an email, and says the missing email alone', () => {
    const unlocked = { ...autopilot, unlocked: true, mergedToUnlock: 0, available: true };
    expect(autopilotChoiceOf({ ...unlocked, noticeTo: 'm•••@gmail.com' }, 'NEXT')).toEqual({
      pill: null,
      noEmail: false,
      canChoose: true,
      lockedAfterChosen: false,
    });
    expect(autopilotChoiceOf({ ...unlocked, noticeTo: null }, 'NEXT')).toMatchObject({
      noEmail: true,
      canChoose: false,
    });
    // Locked, an email would not open it: the pill says why, not the email.
    expect(autopilotChoiceOf({ ...autopilot, available: true, noticeTo: null }, 'NEXT').noEmail).toBe(false);
  });

  it('chosen and then locked again, it works as the level above', () => {
    expect(autopilotChoiceOf({ ...autopilot, available: true }, 'AUTOPILOT').lockedAfterChosen).toBe(true);
    expect(autopilotChoiceOf({ ...autopilot, available: true }, 'NEXT').lockedAfterChosen).toBe(false);
  });
});

describe('a budget and pacing save', () => {
  it('sends the pace only when it changed from the one shown', () => {
    expect(paceSaveOf({ pace: 'EVEN', sweepDays: 3 }, { pace: 'EVEN', hostedLevel: 'NEXT' })).toEqual({ sweepDays: 3 });
    expect(paceSaveOf({ pace: 'FAST', sweepDays: 3 }, { pace: 'EVEN', hostedLevel: 'NEXT' })).toEqual({
      pace: 'FAST',
      sweepDays: 3,
    });
    expect(paceSaveOf({ cycleCapUsd: 50 }, { pace: 'QUEUED', hostedLevel: 'MANUAL' })).toEqual({ cycleCapUsd: 50 });
  });

  it('leaves a stored "only issues I queue" as it is unless changed, and then keeps the level with it', () => {
    expect(paceSaveOf({ pace: 'EVEN', sweepDays: 3 }, { pace: 'QUEUED', hostedLevel: 'MANUAL' })).toEqual({
      sweepDays: 3,
    });
    expect(paceSaveOf({ pace: 'FAST', sweepDays: 3 }, { pace: 'QUEUED', hostedLevel: 'MANUAL' })).toEqual({
      pace: 'FAST',
      sweepDays: 3,
      hostedLevel: 'MANUAL',
    });
  });
});

describe('picking a level', () => {
  const at = (saved: LevelPicking['saved']): LevelPicking => ({ saved, shown: saved, confirming: false });

  it('shows a pick at once and saves only the one the user stopped on, as the level alone', () => {
    const shown = levelPickStep(at('MANUAL'), { kind: 'shown', level: 'NEXT' });
    expect(shown).toEqual({ state: { saved: 'MANUAL', shown: 'NEXT', confirming: false }, send: null });
    expect(levelPickStep(shown.state, { kind: 'settled', level: 'NEXT' })).toEqual({
      state: at('NEXT'),
      send: 'NEXT',
    });
  });

  it('saves nothing for a pick back to the level last sent', () => {
    const away = levelPickStep(at('NEXT'), { kind: 'shown', level: 'MANUAL' }).state;
    expect(levelPickStep(away, { kind: 'settled', level: 'NEXT' })).toEqual({ state: at('NEXT'), send: null });
  });

  it('asks before Autopilot, and saves it only from the confirm', () => {
    const asking = levelPickStep(at('NEXT'), { kind: 'settled', level: 'AUTOPILOT' });
    expect(asking).toEqual({ state: { saved: 'NEXT', shown: 'AUTOPILOT', confirming: true }, send: null });
    expect(levelPickStep(asking.state, { kind: 'confirm' })).toEqual({ state: at('AUTOPILOT'), send: 'AUTOPILOT' });
  });

  it('puts the level last sent back on Cancel or Escape, with no save', () => {
    const asking = levelPickStep(at('NEXT'), { kind: 'settled', level: 'AUTOPILOT' }).state;
    expect(levelPickStep(asking, { kind: 'cancel' })).toEqual({ state: at('NEXT'), send: null });
  });

  it('puts the level before back when a save is refused, and takes a level read again', () => {
    const sent = levelPickStep(at('MANUAL'), { kind: 'settled', level: 'NEXT' }).state;
    expect(levelPickStep(sent, { kind: 'refused', before: 'MANUAL' })).toEqual({ state: at('MANUAL'), send: null });
    expect(levelPickStep(sent, { kind: 'read', level: 'AUTOPILOT' })).toEqual({ state: at('AUTOPILOT'), send: null });
  });
});
