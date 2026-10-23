'use client';

import { createContext, type FC, type ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';

import { hasLines, type OrgPulseSeriesData } from './org-pulse.utils';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { OrgActivityGroupBy, OrgPulseSeriesDocument } from '@/types/generated/graphql';

/** What one grouping returned: the series, `null` for an org with no data, or a failed request. */
export type SeriesResult = { series: OrgPulseSeriesData | null } | { error: true };

/** Results by `resultKey`, so a response that lands after a switch is kept under its own org and grouping. */
export type SeriesResults = Partial<Record<string, SeriesResult>>;

export const resultKey = (login: string, groupBy: OrgActivityGroupBy) => `${login}\n${groupBy}`;

const loadedSeries = (result: SeriesResult | undefined): OrgPulseSeriesData | null =>
  result && 'series' in result ? result.series : null;

export type LinesViewState =
  | { status: 'loading' }
  | { status: 'error' }
  /** `switchable` when another grouping of the org has lines, so the switch stays. */
  | { status: 'empty'; switchable?: boolean }
  /** `groupBy` is the charts' own grouping: while the next one loads, the last charts stay, dimmed. */
  | { status: 'loaded'; series: OrgPulseSeriesData; groupBy: OrgActivityGroupBy; refreshing?: boolean };

/**
 * What the lines charts show for the selected grouping:
 * - while it loads, the last charts with lines stay on screen, dimmed (`refreshing`);
 * - a failed request is an error, with the switch still there to go back to a loaded grouping;
 * - a grouping with no lines is empty; the switch stays only if another grouping of this org has lines.
 */
export function linesViewState(
  results: SeriesResults,
  login: string,
  groupBy: OrgActivityGroupBy,
  shownGroupBy: OrgActivityGroupBy,
): LinesViewState {
  const result = results[resultKey(login, groupBy)];
  const shown = loadedSeries(results[resultKey(login, shownGroupBy)]);

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
    hasLines(loadedSeries(results[resultKey(login, other)])),
  );

  return { status: 'empty', switchable };
}

export type ContributorsViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'loaded'; series: OrgPulseSeriesData };

/**
 * The contributor charts read the same months in every grouping, so any loaded grouping of the org
 * serves them; they wait only while nothing has loaded yet.
 */
export function contributorsViewState(
  results: SeriesResults,
  login: string,
  groupBy: OrgActivityGroupBy,
): ContributorsViewState {
  const order = [groupBy, ...Object.values(OrgActivityGroupBy).filter((other) => other !== groupBy)];
  const series = order.map((other) => loadedSeries(results[resultKey(login, other)])).find(Boolean);

  if (series) {
    return series.months.length ? { status: 'loaded', series } : { status: 'empty' };
  }

  const result = results[resultKey(login, groupBy)];

  if (!result) {
    return { status: 'loading' };
  }

  return 'error' in result ? { status: 'error' } : { status: 'empty' };
}

type OrgPulseSeriesContextValue = {
  groupBy: OrgActivityGroupBy;
  setGroupBy: (groupBy: OrgActivityGroupBy) => void;
  lines: LinesViewState;
  contributors: ContributorsViewState;
  retry: () => void;
};

const OrgPulseSeriesContext = createContext<OrgPulseSeriesContextValue | null>(null);

export const useOrgPulseSeries = () => {
  const value = useContext(OrgPulseSeriesContext);

  if (!value) {
    throw new Error('useOrgPulseSeries must be used inside OrgPulseSeriesProvider');
  }

  return value;
};

type OrgPulseSeriesProviderProps = {
  login: string;
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
 * own org and grouping whenever it lands, and moves the charts only if its grouping is still the
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
export function seriesToRequest(state: SeriesState, login: string): string | null {
  const key = resultKey(login, state.groupBy);
  return state.results[key] || state.inFlight[key] ? null : key;
}

/** The grouping whose charts show: the selected one once it has lines, else the last one that had. */
const shownOf = (state: SeriesState, login: string) =>
  hasLines(loadedSeries(state.results[resultKey(login, state.groupBy)])) ? state.groupBy : state.shownGroupBy;

/**
 * Loads the 60-month series in the browser, so the server-rendered page carries only the facts.
 * Each grouping is fetched once: a request still in flight when the user switches is kept, not repeated.
 */
export const OrgPulseSeriesProvider: FC<OrgPulseSeriesProviderProps> = ({ login, children }) => {
  const [state, dispatch] = useReducer(seriesReducer, initialSeriesState);
  const toRequest = seriesToRequest(state, login);
  const { groupBy, results } = state;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `toRequest` names the org and grouping
  useEffect(() => {
    if (!toRequest) {
      return;
    }

    dispatch({ type: 'requested', key: toRequest });

    graphqlClient(OrgPulseSeriesDocument, { login, groupBy })
      .then((data): SeriesResult => ({ series: data?.organization?.pulseSeries ?? null }))
      .catch((error: unknown): SeriesResult => {
        console.error('Error loading the org pulse series:', error);
        return { error: true };
      })
      .then((result) => dispatch({ type: 'settled', key: toRequest, groupBy, result }));
  }, [toRequest]);

  const value = useMemo<OrgPulseSeriesContextValue>(
    () => ({
      groupBy,
      setGroupBy: (next: OrgActivityGroupBy) => dispatch({ type: 'select', groupBy: next }),
      lines: linesViewState(results, login, groupBy, shownOf(state, login)),
      contributors: contributorsViewState(results, login, groupBy),
      retry: () => dispatch({ type: 'retry', key: resultKey(login, groupBy) }),
    }),
    [state, groupBy, results, login],
  );

  return <OrgPulseSeriesContext.Provider value={value}>{children}</OrgPulseSeriesContext.Provider>;
};
