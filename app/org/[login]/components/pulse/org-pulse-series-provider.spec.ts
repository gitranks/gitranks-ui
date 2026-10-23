import { describe, expect, it } from 'vitest';

import { series } from './org-pulse.fixtures';
import { contributorsViewState, linesViewState, resultKey, type SeriesResults } from './org-pulse-series-provider';
import { OrgActivityGroupBy } from '@/types/generated/graphql';

const { Type, Language, Kind } = OrgActivityGroupBy;
const noLines = { ...series, snapshot: [[0, 0, 0]], added: [[0, 0, 0]], deleted: [[0, 0, 0]] };

const results = (entries: [OrgActivityGroupBy, SeriesResults[string]][], login = 'acme'): SeriesResults =>
  Object.fromEntries(entries.map(([groupBy, result]) => [resultKey(login, groupBy), result]));

describe('linesViewState', () => {
  it('is loading before anything has loaded', () => {
    expect(linesViewState({}, 'acme', Type, Type)).toEqual({ status: 'loading' });
  });

  it('keeps the last charts, dimmed, while the next grouping loads', () => {
    expect(linesViewState(results([[Type, { series }]]), 'acme', Language, Type)).toEqual({
      status: 'loaded',
      series,
      groupBy: Type,
      refreshing: true,
    });
  });

  it('reports an error for a failed grouping', () => {
    expect(
      linesViewState(
        results([
          [Type, { series }],
          [Kind, { error: true }],
        ]),
        'acme',
        Kind,
        Type,
      ),
    ).toEqual({ status: 'error' });
  });

  it('is empty with no switch when the org has no lines, and keeps it when another grouping has some', () => {
    expect(linesViewState(results([[Type, { series: null }]]), 'acme', Type, Type)).toEqual({
      status: 'empty',
      switchable: false,
    });
    expect(
      linesViewState(
        results([
          [Type, { series }],
          [Kind, { series: noLines }],
        ]),
        'acme',
        Kind,
        Type,
      ),
    ).toEqual({ status: 'empty', switchable: true });
  });

  it("never shows another org's results", () => {
    expect(linesViewState(results([[Type, { series }]], 'other'), 'acme', Type, Type)).toEqual({ status: 'loading' });
  });
});

describe('contributorsViewState', () => {
  it('uses any loaded grouping: the contributor arrays are the same in each', () => {
    expect(
      contributorsViewState(
        results([
          [Type, { series }],
          [Language, { error: true }],
        ]),
        'acme',
        Language,
      ),
    ).toEqual({ status: 'loaded', series });
  });

  it('waits, fails or is empty only while no grouping has loaded', () => {
    expect(contributorsViewState({}, 'acme', Type)).toEqual({ status: 'loading' });
    expect(contributorsViewState(results([[Type, { error: true }]]), 'acme', Type)).toEqual({ status: 'error' });
    expect(contributorsViewState(results([[Type, { series: null }]]), 'acme', Type)).toEqual({ status: 'empty' });
  });
});
