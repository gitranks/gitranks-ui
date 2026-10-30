import { describe, expect, it } from 'vitest';

import { appliedLimitsOf, manualDraftOf, manualLimitsOf, manualSummaryOf, renewalLabelOf } from './connect-limits';

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

describe('renewalLabelOf', () => {
  it('marks our guess', () => {
    expect(renewalLabelOf(30, 30)).toBe('The 30th (today, our guess)');
    expect(renewalLabelOf(1, 30)).toBe('The 1st');
    expect(renewalLabelOf(22, null)).toBe('The 22nd');
  });
});
