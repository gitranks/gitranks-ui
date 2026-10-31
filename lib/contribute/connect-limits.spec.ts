import { describe, expect, it } from 'vitest';

import { settings } from './__fixtures__/contribute-views';
import {
  appliedLimitsOf,
  connectLimitsOf,
  manualDraftFromSettings,
  manualDraftOf,
  manualLimitsOf,
  manualSummaryOf,
  renewalLabelOf,
} from './connect-limits';
import type { ContributeSettings } from './contribute.types';

describe('manualLimitsOf', () => {
  it('starts from $50 a month and $5 an attempt, spread across the month, with no week or day cap', () => {
    expect(manualLimitsOf(manualDraftOf())).toEqual({
      ok: true,
      cycleCapUsd: 50,
      limits: { weekCapUsd: null, dayCapUsd: null, attemptCapUsd: 5, pace: 'EVEN' },
    });
  });

  it('reads amounts typed with a dollar sign, and caps left empty as none', () => {
    expect(
      manualLimitsOf(manualDraftOf({ month: '$80', week: ' $20 ', day: '', attempt: '$2.50', pace: 'FAST' })),
    ).toEqual({
      ok: true,
      cycleCapUsd: 80,
      limits: { weekCapUsd: 20, dayCapUsd: null, attemptCapUsd: 2.5, pace: 'FAST' },
    });
  });

  it('needs the month, and holds each amount to its bounds and two decimals', () => {
    expect(manualLimitsOf(manualDraftOf({ month: '' }))).toMatchObject({ ok: false, field: 'month' });
    expect(manualLimitsOf(manualDraftOf({ month: '0' }))).toMatchObject({ ok: false, field: 'month' });
    expect(manualLimitsOf(manualDraftOf({ month: '6000' }))).toMatchObject({ ok: false, field: 'month' });
    expect(manualLimitsOf(manualDraftOf({ week: 'lots' }))).toMatchObject({ ok: false, field: 'week' });
    expect(manualLimitsOf(manualDraftOf({ attempt: '' }))).toMatchObject({ ok: false, field: 'attempt' });
    expect(manualLimitsOf(manualDraftOf({ attempt: '0.25' }))).toMatchObject({
      ok: false,
      field: 'attempt',
      message: 'Each attempt is between $0.50 and $100.',
    });
    expect(manualLimitsOf(manualDraftOf({ day: '1.005' }))).toMatchObject({ ok: false, field: 'day' });
  });

  it('refuses an attempt cap above any cap that is set, naming the smallest', () => {
    expect(manualLimitsOf(manualDraftOf({ month: '4' }))).toEqual({
      ok: false,
      field: 'attempt',
      message: "Each attempt can't be more than each month ($4): no attempt could start.",
    });
    expect(manualLimitsOf(manualDraftOf({ week: '20', day: '3' }))).toMatchObject({
      ok: false,
      field: 'attempt',
      message: "Each attempt can't be more than each day ($3): no attempt could start.",
    });
    // Equal is room for one; a week cap above the month is taken, as Settings takes it: the smallest wins.
    expect(manualLimitsOf(manualDraftOf({ day: '5' })).ok).toBe(true);
    expect(manualLimitsOf(manualDraftOf({ week: '500' })).ok).toBe(true);
  });
});

describe('manualSummaryOf', () => {
  it('says what the limits add up to, or what is missing', () => {
    expect(manualSummaryOf(manualDraftOf())).toBe('At most $50 a month and $5 an attempt, spread across your month.');
    expect(manualSummaryOf(manualDraftOf({ week: '20', day: '10', pace: 'FAST' }))).toBe(
      'At most $50 a month, $20 a week, $10 a day and $5 an attempt, as fast as those caps allow.',
    );
    expect(manualSummaryOf(manualDraftOf({ month: '' }))).toBe('Set a monthly amount to continue.');
    expect(manualSummaryOf(manualDraftOf({ day: '2' }))).toContain("can't be more than each day ($2)");
  });
});

describe('appliedLimitsOf', () => {
  const rows = (...args: Parameters<typeof appliedLimitsOf>) =>
    Object.fromEntries(appliedLimitsOf(...args).limits.map(({ label, value }) => [label, value]));

  it("starts the month from the plan's allowance", () => {
    expect(rows('plan', 'MAX_20X', manualDraftOf())['Each month']).toBe(
      "up to $200 of your credits, Max 20x's monthly allowance",
    );
    expect(rows('plan', 'TEAM_STANDARD', manualDraftOf())['Each month']).toBe(
      "up to $20 of your credits, Team Standard's monthly allowance",
    );
  });

  it("shows the user's own numbers once they hold", () => {
    const own = rows('manual', 'MAX_5X', manualDraftOf({ month: '80', day: '10', attempt: '3', pace: 'FAST' }));

    expect(own['Each month']).toBe('at most $80, the amount you set');
    expect(own['Each attempt']).toBe('at most $3, it stops at the cap');
    expect(own['Week and day']).toBe('$10 a day: the smallest cap wins');
    expect(rows('manual', 'MAX_5X', manualDraftOf({ month: '' }))['Each month']).toBe('the amount you set above');
    expect(
      appliedLimitsOf('manual', 'MAX_5X', manualDraftOf({ pace: 'FAST' })).picked.find(
        ({ label }) => label === 'Pacing',
      ),
    ).toEqual({ label: 'Pacing', value: 'as fast as the caps allow' });
  });
});

describe('a key connected before', () => {
  const stored: ContributeSettings = {
    ...settings,
    cycleCapUsd: 150,
    weekCapUsd: 40,
    dayCapUsd: null,
    attemptCapUsd: 3,
    pace: 'QUEUED',
    attemptsAtATime: 2,
    maxChangedLines: 250,
  };
  const rows = (...args: Parameters<typeof appliedLimitsOf>) =>
    Object.fromEntries(appliedLimitsOf(...args).limits.map(({ label, value }) => [label, value]));
  const picked = (...args: Parameters<typeof appliedLimitsOf>) =>
    Object.fromEntries(appliedLimitsOf(...args).picked.map(({ label, value }) => [label, value]));

  it('says the stored settings on the same plan, the monthly cap among them, and no plan credit', () => {
    const same = rows('plan', 'MAX_5X', manualDraftOf(), { plan: 'MAX_5X', settings: stored });

    expect(same['Each month']).toBe('at most $150, your monthly cap as it is');
    expect(same['Each attempt']).toBe('at most $3, it stops at the cap');
    expect(same['Week and day']).toBe('$40 a week: the smallest cap wins');
    expect(same['At a time']).toBe('2 attempts, and at most 3 of your PRs open');
    expect(same['Each PR']).toBe('at most 250 changed lines in 15 files');
    expect(picked('plan', 'MAX_5X', manualDraftOf(), { plan: 'MAX_5X', settings: stored }).Pacing).toBe(
      'only on issues you queue',
    );
  });

  it("takes a new plan's allowance, keeping the rest, the attempt cap brought down to it", () => {
    const moved = rows('plan', 'TEAM_STANDARD', manualDraftOf(), {
      plan: 'MAX_5X',
      settings: { ...stored, attemptCapUsd: 30 },
    });

    expect(moved['Each month']).toBe("up to $20 of your credits, Team Standard's monthly allowance");
    expect(moved['Each attempt']).toBe('at most $20, it stops at the cap');
    expect(moved['Week and day']).toBe('$40 a week: the smallest cap wins');
  });

  it("says the user's own picks, not ours", () => {
    const own = picked('plan', 'MAX_5X', manualDraftOf(), {
      plan: 'MAX_5X',
      settings: stored,
      preferences: { languages: ['RUST', 'GO'], topicIds: [], kinds: ['BUG'], maxSize: 'M' },
    });

    expect(own.Issues).toBe('bugs, up to medium');
    expect(own.Languages).toBe('Rust, Go first');
    expect(picked('plan', 'MAX_5X', manualDraftOf()).Issues).toBe('every kind and size');
  });

  it('starts the hand-set limits from the stored settings, a QUEUED pace kept', () => {
    const draft = manualDraftOf(manualDraftFromSettings(stored));

    expect(draft).toEqual({ month: '150', week: '40', day: '', attempt: '3', pace: 'QUEUED' });
    expect(manualSummaryOf(draft)).toBe(
      'At most $150 a month, $40 a week and $3 an attempt, only on issues you queue.',
    );
  });

  it('sends only what the user changed, and never turns a QUEUED pace into another', () => {
    const untouched = manualLimitsOf(manualDraftOf(manualDraftFromSettings(stored)));
    if (!untouched.ok) throw new Error('the stored limits hold');
    expect(connectLimitsOf(untouched.limits, stored)).toEqual({});

    const edited = manualLimitsOf(manualDraftOf({ ...manualDraftFromSettings(stored), day: '10' }));
    if (!edited.ok) throw new Error('the edited limits hold');
    expect(connectLimitsOf(edited.limits, stored)).toEqual({ dayCapUsd: 10 });

    const paced = manualLimitsOf(manualDraftOf({ ...manualDraftFromSettings(stored), pace: 'FAST' }));
    if (!paced.ok) throw new Error('the paced limits hold');
    expect(connectLimitsOf(paced.limits, stored)).toEqual({ pace: 'FAST' });

    // A first key sends them all.
    const first = manualLimitsOf(manualDraftOf());
    if (!first.ok) throw new Error('the defaults hold');
    expect(connectLimitsOf(first.limits, null)).toEqual({
      weekCapUsd: null,
      dayCapUsd: null,
      attemptCapUsd: 5,
      pace: 'EVEN',
    });
  });
});

describe('renewalLabelOf', () => {
  it('marks our guess', () => {
    expect(renewalLabelOf(30, 30)).toBe('The 30th (today, our guess)');
    expect(renewalLabelOf(1, 30)).toBe('The 1st');
    expect(renewalLabelOf(22, null)).toBe('The 22nd');
  });
});
