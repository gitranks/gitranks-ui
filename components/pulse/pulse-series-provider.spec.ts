import { describe, expect, it } from 'vitest';

import { series } from './pulse.fixtures';
import {
  contributorsViewState,
  initialSeriesState,
  linesViewState,
  seriesReducer as reduce,
  resultKey,
  type SeriesResults,
  seriesToRequest,
} from './pulse-series-provider';
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

describe('seriesReducer', () => {
  const typeKey = resultKey('acme', Type);
  const languageKey = resultKey('acme', Language);

  it('asks for the selected grouping once, never while it is on its way', () => {
    expect(seriesToRequest(initialSeriesState, 'acme')).toBe(typeKey);

    const asked = reduce(initialSeriesState, { type: 'requested', key: typeKey });
    expect(seriesToRequest(asked, 'acme')).toBeNull();

    // Switching away and back while it is in flight does not send it again.
    const back = reduce(reduce(asked, { type: 'select', groupBy: Language }), { type: 'select', groupBy: Type });
    expect(seriesToRequest(back, 'acme')).toBeNull();
  });

  it('keeps a response that lands after a switch under its own grouping, without moving the charts', () => {
    const asked = reduce(initialSeriesState, { type: 'requested', key: typeKey });
    const loaded = reduce(asked, { type: 'settled', key: typeKey, groupBy: Type, result: { series } });
    const switched = reduce(reduce(loaded, { type: 'select', groupBy: Language }), {
      type: 'requested',
      key: languageKey,
    });
    const kindKey = resultKey('acme', Kind);
    const onKind = reduce(reduce(switched, { type: 'select', groupBy: Kind }), { type: 'requested', key: kindKey });
    const late = reduce(onKind, { type: 'settled', key: languageKey, groupBy: Language, result: { series } });

    expect(late.results[languageKey]).toEqual({ series });
    expect(late.inFlight[languageKey]).toBeUndefined();
    expect(late.shownGroupBy).toBe(Type);
    expect(linesViewState(late.results, 'acme', Kind, late.shownGroupBy)).toMatchObject({
      status: 'loaded',
      groupBy: Type,
      refreshing: true,
    });
  });

  it('shows the selected grouping once it lands with lines', () => {
    const switched = reduce(initialSeriesState, { type: 'select', groupBy: Language });
    const loaded = reduce(switched, { type: 'settled', key: languageKey, groupBy: Language, result: { series } });

    expect(loaded.shownGroupBy).toBe(Language);
  });

  it('retries only a failed result, which asks for it again', () => {
    const failed = reduce(reduce(initialSeriesState, { type: 'requested', key: typeKey }), {
      type: 'settled',
      key: typeKey,
      groupBy: Type,
      result: { error: true },
    });
    expect(seriesToRequest(failed, 'acme')).toBeNull();

    const retried = reduce(failed, { type: 'retry', key: typeKey });
    expect(seriesToRequest(retried, 'acme')).toBe(typeKey);

    const loaded = reduce(failed, { type: 'settled', key: typeKey, groupBy: Type, result: { series } });
    expect(reduce(loaded, { type: 'retry', key: typeKey })).toBe(loaded);
  });
});
