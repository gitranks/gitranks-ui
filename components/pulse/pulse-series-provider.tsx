'use client';

import { createContext, type FC, type ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';

import { hasLines, type PulseSeriesData } from './pulse.utils';
import { OrgActivityGroupBy } from '@/types/generated/graphql';

/** Loads one grouping's series: `null` when there is no data. */
export type LoadPulseSeries = (groupBy: OrgActivityGroupBy) => Promise<PulseSeriesData | null>;

/** What one grouping returned: the series, `null` when there is no data, or a failed request. */
export type SeriesResult = { series: PulseSeriesData | null } | { error: true };

/** Results by `resultKey`, so a response that lands after a switch is kept under its own scope and grouping. */
export type SeriesResults = Partial<Record<string, SeriesResult>>;

export const resultKey = (scope: string, groupBy: OrgActivityGroupBy) => `${scope}\n${groupBy}`;

const loadedSeries = (result: SeriesResult | undefined): PulseSeriesData | null =>
  result && 'series' in result ? result.series : null;

export type LinesViewState =
  | { status: 'loading' }
  | { status: 'error' }
  /** `switchable` when another grouping has lines, so the switch stays. */
  | { status: 'empty'; switchable?: boolean }
  /** `groupBy` is the charts' own grouping: while the next one loads, the last charts stay, dimmed. */
  | { status: 'loaded'; series: PulseSeriesData; groupBy: OrgActivityGroupBy; refreshing?: boolean };

/**
 * What the lines charts show for the selected grouping:
 * - while it loads, the last charts with lines stay on screen, dimmed (`refreshing`);
 * - a failed request is an error, with the switch still there to go back to a loaded grouping;
 * - a grouping with no lines is empty; the switch stays only if another grouping has lines.
 */
export function linesViewState(
  results: SeriesResults,
  scope: string,
  groupBy: OrgActivityGroupBy,
  shownGroupBy: OrgActivityGroupBy,
): LinesViewState {
  const result = results[resultKey(scope, groupBy)];
  const shown = loadedSeries(results[resultKey(scope, shownGroupBy)]);

  if (!result) {
    return hasLines(shown)
      ? { status: 'loaded', series: shown, groupBy: shownGroupBy, refreshing: true }
      : { status: 'loading' };
  }

  if ('error' in result) {
    return { status: 'error' };
  }

  if (hasLines(result.series)) {
    return { status: 'loaded', series: result.series, groupBy };
  }

  const switchable = Object.values(OrgActivityGroupBy).some((other) =>
    hasLines(loadedSeries(results[resultKey(scope, other)])),
  );

  return { status: 'empty', switchable };
}

export type ContributorsViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'loaded'; series: PulseSeriesData };

/**
 * The contributor charts read the same months in every grouping, so any loaded grouping
 * serves them; they wait only while nothing has loaded yet.
 */
export function contributorsViewState(
  results: SeriesResults,
  scope: string,
  groupBy: OrgActivityGroupBy,
): ContributorsViewState {
  const order = [groupBy, ...Object.values(OrgActivityGroupBy).filter((other) => other !== groupBy)];
  const series = order.map((other) => loadedSeries(results[resultKey(scope, other)])).find(Boolean);

  if (series) {
    return series.months.length ? { status: 'loaded', series } : { status: 'empty' };
  }

  const result = results[resultKey(scope, groupBy)];

  if (!result) {
    return { status: 'loading' };
  }

  return 'error' in result ? { status: 'error' } : { status: 'empty' };
}

type PulseSeriesContextValue = {
  groupBy: OrgActivityGroupBy;
  setGroupBy: (groupBy: OrgActivityGroupBy) => void;
  lines: LinesViewState;
  contributors: ContributorsViewState;
  retry: () => void;
};

const PulseSeriesContext = createContext<PulseSeriesContextValue | null>(null);

export const usePulseSeries = () => {
  const value = useContext(PulseSeriesContext);

  if (!value) {
    throw new Error('usePulseSeries must be used inside PulseSeriesProvider');
  }

  return value;
};

type PulseSeriesProviderProps = {
  /** Names the organization or repository: results are kept per scope. */
  scope: string;
  loadSeries: LoadPulseSeries;
  children: ReactNode;
};

export type SeriesState = {
  /** The grouping the switch shows as selected. */
  groupBy: OrgActivityGroupBy;
  /** The last grouping whose charts had lines: shown, dimmed, while another one loads. */
  shownGroupBy: OrgActivityGroupBy;
  results: SeriesResults;
  /** Requests still on their way, by `resultKey`: never sent twice. */
  inFlight: Partial<Record<string, true>>;
};

export type SeriesEvent =
  | { type: 'select'; groupBy: OrgActivityGroupBy }
  | { type: 'requested'; key: string }
  | { type: 'settled'; key: string; groupBy: OrgActivityGroupBy; result: SeriesResult }
  | { type: 'retry'; key: string };

export const initialSeriesState: SeriesState = {
  groupBy: OrgActivityGroupBy.Type,
  shownGroupBy: OrgActivityGroupBy.Type,
  results: {},
  inFlight: {},
};

/**
 * The series requests as a pure function of the state and one event. A response is kept under its
 * own scope and grouping whenever it lands, and moves the charts only if its grouping is still the
 * selected one.
 */
export function seriesReducer(state: SeriesState, event: SeriesEvent): SeriesState {
  switch (event.type) {
    case 'select':
      return { ...state, groupBy: event.groupBy };

    case 'requested':
      return { ...state, inFlight: { ...state.inFlight, [event.key]: true } };

    case 'settled': {
      const { [event.key]: _, ...inFlight } = state.inFlight;
      const selected = event.groupBy === state.groupBy && hasLines(loadedSeries(event.result));
      return {
        ...state,
        inFlight,
        results: { ...state.results, [event.key]: event.result },
        shownGroupBy: selected ? event.groupBy : state.shownGroupBy,
      };
    }

    case 'retry': {
      const result = state.results[event.key];
      // Only a failed result is cleared, which runs its request again.
      return result && 'error' in result ? { ...state, results: { ...state.results, [event.key]: undefined } } : state;
    }
  }
}

/** The request the selected grouping needs: none while its result is held or on its way. */
export function seriesToRequest(state: SeriesState, scope: string): string | null {
  const key = resultKey(scope, state.groupBy);
  return state.results[key] || state.inFlight[key] ? null : key;
}

/** The grouping whose charts show: the selected one once it has lines, else the last one that had. */
const shownOf = (state: SeriesState, scope: string) =>
  hasLines(loadedSeries(state.results[resultKey(scope, state.groupBy)])) ? state.groupBy : state.shownGroupBy;

/**
 * Loads the 60-month series in the browser, so the server-rendered page carries only the facts.
 * Each grouping is fetched once: a request still in flight when the user switches is kept, not repeated.
 */
export const PulseSeriesProvider: FC<PulseSeriesProviderProps> = ({ scope, loadSeries, children }) => {
  const [state, dispatch] = useReducer(seriesReducer, initialSeriesState);
  const toRequest = seriesToRequest(state, scope);
  const { groupBy, results } = state;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `toRequest` names the scope and grouping
  useEffect(() => {
    if (!toRequest) {
      return;
    }

    dispatch({ type: 'requested', key: toRequest });

    loadSeries(groupBy)
      .then((series): SeriesResult => ({ series }))
      .catch((error: unknown): SeriesResult => {
        console.error('Error loading the pulse series:', error);
        return { error: true };
      })
      .then((result) => dispatch({ type: 'settled', key: toRequest, groupBy, result }));
  }, [toRequest]);

  const value = useMemo<PulseSeriesContextValue>(
    () => ({
      groupBy,
      setGroupBy: (next: OrgActivityGroupBy) => dispatch({ type: 'select', groupBy: next }),
      lines: linesViewState(results, scope, groupBy, shownOf(state, scope)),
      contributors: contributorsViewState(results, scope, groupBy),
      retry: () => dispatch({ type: 'retry', key: resultKey(scope, groupBy) }),
    }),
    [state, groupBy, results, scope],
  );

  return <PulseSeriesContext.Provider value={value}>{children}</PulseSeriesContext.Provider>;
};
