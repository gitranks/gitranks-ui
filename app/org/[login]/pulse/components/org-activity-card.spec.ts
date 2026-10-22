import { describe, expect, it } from 'vitest';

import type { OrgActivityData } from './org-activity.utils';
import { type ActivityResults, resultKey, viewState } from './org-activity-card';
import { OrgActivityGroupBy } from '@/types/generated/graphql';

const { Type, Language, Kind } = OrgActivityGroupBy;

const chart: OrgActivityData = {
  months: ['2025-01', '2025-02'],
  series: [{ label: 'TypeScript', shares: [1, 1] }],
  commits: [40, 50],
  lowVolume: [false, false],
  otherUnknownShare: 0,
  computedAt: '2026-10-18T02:00:00.000Z',
  scopeNote: '1 public repository with 5+ stars, pushed in the last 5 years',
};

const results = (entries: [OrgActivityGroupBy, ActivityResults[string]][], login = 'acme'): ActivityResults =>
  Object.fromEntries(entries.map(([groupBy, result]) => [resultKey(login, groupBy), result]));

describe('viewState', () => {
  it('is loading before anything has loaded', () => {
    expect(viewState({}, 'acme', Type, Type)).toEqual({ status: 'loading' });
  });

  it('keeps the last chart, dimmed, while the next grouping loads', () => {
    expect(viewState(results([[Type, { chart }]]), 'acme', Language, Type)).toEqual({
      status: 'loaded',
      chart,
      groupBy: Type,
      refreshing: true,
    });
  });

  it('shows the loaded grouping', () => {
    expect(viewState(results([[Type, { chart }]]), 'acme', Type, Type)).toEqual({
      status: 'loaded',
      chart,
      groupBy: Type,
    });
  });

  it('reports an error for a failed grouping even after another one loaded', () => {
    expect(
      viewState(
        results([
          [Type, { chart }],
          [Language, { error: true }],
        ]),
        'acme',
        Language,
        Type,
      ),
    ).toEqual({
      status: 'error',
    });
  });

  it('is loading again once a failed result is cleared for a retry', () => {
    expect(viewState(results([[Language, undefined]]), 'acme', Language, Language)).toEqual({ status: 'loading' });
  });

  it('is empty, with no switch, when the org has no data', () => {
    expect(viewState(results([[Type, { chart: null }]]), 'acme', Type, Type)).toEqual({
      status: 'empty',
      switchable: false,
    });
  });

  it('keeps the switch on an empty grouping when another grouping has data', () => {
    expect(
      viewState(
        results([
          [Type, { chart }],
          [Kind, { chart: { ...chart, months: [] } }],
        ]),
        'acme',
        Kind,
        Type,
      ),
    ).toEqual({ status: 'empty', switchable: true });
  });

  it("never shows another org's results", () => {
    expect(viewState(results([[Type, { chart }]], 'other'), 'acme', Type, Type)).toEqual({ status: 'loading' });
  });
});
