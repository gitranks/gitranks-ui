import { describe, expect, it } from 'vitest';

import { issueKeptOf, KEPT_FOR_NOW_LINE, KEPT_LINE, keptLineOf, keptOpensLineOf } from './issue-page-kept';

const NOW = new Date('2026-10-28T12:00:00.000Z');

describe('an issue kept for learners, as the page reads it', () => {
  it('is kept always (no end), kept until a time, or not kept', () => {
    expect(issueKeptOf({ keptForLearners: { until: null } })).toEqual({ until: null });
    expect(issueKeptOf({ keptForLearners: {} })).toEqual({ until: null });
    expect(issueKeptOf({ keptForLearners: { until: '2026-10-28T14:30:00.000Z' } })).toEqual({
      until: '2026-10-28T14:30:00.000Z',
    });
    expect(issueKeptOf({ keptForLearners: null })).toBeNull();
    expect(issueKeptOf({})).toBeNull();
    expect(issueKeptOf(null)).toBeNull();
  });

  it('is none for an answer the page cannot draw', () => {
    expect(issueKeptOf({ keptForLearners: { until: 'soon' } })).toBeNull();
    expect(issueKeptOf({ keptForLearners: { until: 1_700_000_000 } })).toBeNull();
    expect(issueKeptOf({ keptForLearners: true })).toBeNull();
  });
});

describe('what the page says of it', () => {
  it('says it is kept, or kept for now', () => {
    expect(keptLineOf({ until: null })).toBe(KEPT_LINE);
    expect(KEPT_LINE).toBe('This issue is kept for learners.');
    expect(keptLineOf({ until: '2026-10-28T14:30:00.000Z' })).toBe(KEPT_FOR_NOW_LINE);
    expect(KEPT_FOR_NOW_LINE).toBe('This issue is kept for learners for now.');
  });

  it('says when it opens to Contribute: the time the same day, else the day too, in the zone given', () => {
    expect(keptOpensLineOf('2026-10-28T14:30:00.000Z', NOW, 'UTC')).toBe('It opens to Contribute at 14:30.');
    expect(keptOpensLineOf('2026-10-29T09:05:00.000Z', NOW, 'UTC')).toBe('It opens to Contribute on 29 Oct at 09:05.');
    // 23:30 UTC is the next morning in Tokyo.
    expect(keptOpensLineOf('2026-10-28T23:30:00.000Z', NOW, 'Asia/Tokyo')).toBe(
      'It opens to Contribute on 29 Oct at 08:30.',
    );
  });

  it('says no time once it is past, or for a time that is not one', () => {
    expect(keptOpensLineOf('2026-10-28T12:00:00.000Z', NOW, 'UTC')).toBeNull();
    expect(keptOpensLineOf('2026-10-28T11:00:00.000Z', NOW, 'UTC')).toBeNull();
    expect(keptOpensLineOf('soon', NOW, 'UTC')).toBeNull();
  });
});
