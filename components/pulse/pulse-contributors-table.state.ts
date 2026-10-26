import type { PulseContributorRow } from './pulse.utils';
import { CONTRIBUTORS_PAGE_SIZE } from '@/app/app.consts';
import { OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';
import type { ContributorsQuery } from '@/types/pulse.types';

export const DEFAULT_QUERY: ContributorsQuery = {
  period: OrgPulsePeriod.Last_12Months,
  sortBy: OrgPulseContributorSort.Lines,
  label: null,
};

/** One page request: `replace` swaps the rows for the answer, otherwise it is appended. */
export type PageRequest = { id: number; query: ContributorsQuery; offset: number; first: number; replace: boolean };

export type ContributorsPage = {
  total: number;
  unlinkedAuthors: number;
  labels: string[];
  items: PulseContributorRow[];
};

/** Loads one page of the table: `null` when there is no data. */
export type LoadContributorsPage = (
  query: ContributorsQuery,
  offset: number,
  first: number,
) => Promise<ContributorsPage | null>;

export type ContributorsTableState = {
  query: ContributorsQuery;
  items: PulseContributorRow[];
  /**
   * Whether the rows came from the API in this browser. The server-rendered rows come from facts
   * cached for hours: a live page appended to them could repeat or skip a row, so the first page
   * the browser asks for replaces them.
   */
  live: boolean;
  /** Rows the API holds for the query; unknown until a page has loaded. */
  total: number | null;
  unlinkedAuthors: number;
  /** How many of the loaded rows are shown. */
  visible: number;
  /** The request whose answer is awaited; an answer to any other request is ignored. */
  pending: PageRequest | null;
  /** The request that failed, kept for "Try again". */
  failed: PageRequest | null;
  /** The last request id handed out. */
  lastId: number;
  /** The Language labels of `labelsPeriod`: loaded in the background, never dimming the table or failing it. */
  labels: string[] | null;
  labelsPeriod: OrgPulsePeriod | null;
  labelsStatus: 'idle' | 'loading' | 'error';
};

/** The facts hold the first rows of the 12-month table by lines: this many rows means there may be more. */
export const FACTS_ROWS = 10;

export type ContributorsTableEvent =
  | { type: 'query'; query: ContributorsQuery }
  | { type: 'showMore' }
  | { type: 'retry' }
  | { type: 'loaded'; id: number; page: ContributorsPage }
  | { type: 'failed'; id: number }
  | { type: 'labelsRequested' }
  | { type: 'labelsLoaded'; period: OrgPulsePeriod; labels: string[] }
  | { type: 'labelsFailed'; period: OrgPulsePeriod };

export function initialTableState(items: PulseContributorRow[], unlinkedAuthors: number): ContributorsTableState {
  return {
    query: DEFAULT_QUERY,
    items,
    live: false,
    total: null,
    unlinkedAuthors,
    visible: items.length || CONTRIBUTORS_PAGE_SIZE,
    pending: null,
    failed: null,
    lastId: 0,
    labels: null,
    labelsPeriod: null,
    labelsStatus: 'idle',
  };
}

const request = (state: ContributorsTableState, fields: Omit<PageRequest, 'id'>): ContributorsTableState => {
  const id = state.lastId + 1;
  return { ...state, lastId: id, pending: { id, ...fields }, failed: null };
};

/** Whether "Show more" has anything to show: unknown counts follow the server rows' length. */
export function canShowMore(state: ContributorsTableState): boolean {
  if (!state.live) {
    return state.items.length >= FACTS_ROWS;
  }

  return state.visible < state.items.length || (state.total !== null && state.items.length < state.total);
}

/** Rows keyed by account: a page that overlaps the loaded rows adds only the new ones. */
const rowKey = (row: PulseContributorRow) => row.githubId ?? row.login;

function appendRows(rows: PulseContributorRow[], next: PulseContributorRow[]) {
  const seen = new Set(rows.map(rowKey));
  return [...rows, ...next.filter((row) => !seen.has(rowKey(row)))];
}

/**
 * The contributor table's paging, as a pure function of the state and one event. Nothing loads
 * until the user asks: a new query or "Show more" sets `pending`, and the component runs it.
 */
export function contributorsTableReducer(
  state: ContributorsTableState,
  event: ContributorsTableEvent,
): ContributorsTableState {
  switch (event.type) {
    case 'query': {
      const next = request(state, { query: event.query, offset: 0, first: CONTRIBUTORS_PAGE_SIZE, replace: true });
      // A labels request for another period is left to finish unread; the page brings this period's labels.
      const labelsStatus = event.query.period === state.query.period ? state.labelsStatus : 'idle';
      return { ...next, query: event.query, visible: CONTRIBUTORS_PAGE_SIZE, labelsStatus };
    }

    case 'showMore': {
      if (!canShowMore(state)) {
        return state;
      }

      const visible = state.visible + CONTRIBUTORS_PAGE_SIZE;

      // The cached server rows, or a first page still on its way: ask again for every row to show,
      // from the top, and replace. The older request's answer is then ignored.
      if (!state.live) {
        return {
          ...request(state, { query: state.query, offset: 0, first: visible, replace: true }),
          visible,
        };
      }

      if (state.pending) {
        return state;
      }

      if (visible > state.items.length && (state.total === null || state.items.length < state.total)) {
        return {
          ...request(state, {
            query: state.query,
            offset: state.items.length,
            first: CONTRIBUTORS_PAGE_SIZE,
            replace: false,
          }),
          visible,
        };
      }

      return { ...state, visible };
    }

    case 'retry': {
      if (!state.failed) {
        return state;
      }

      const { id: _, ...failed } = state.failed;
      return request(state, failed);
    }

    case 'loaded': {
      const { pending } = state;

      if (!pending || pending.id !== event.id) {
        return state;
      }

      const { page } = event;
      return {
        ...state,
        items: pending.replace ? page.items : appendRows(state.items, page.items),
        live: true,
        total: page.total,
        unlinkedAuthors: page.unlinkedAuthors,
        labels: page.labels,
        labelsPeriod: pending.query.period,
        labelsStatus: 'idle',
        pending: null,
        failed: null,
      };
    }

    case 'failed':
      return state.pending?.id === event.id ? { ...state, pending: null, failed: state.pending } : state;

    case 'labelsRequested':
      return state.labelsPeriod === state.query.period || state.labelsStatus === 'loading'
        ? state
        : { ...state, labelsStatus: 'loading' };

    case 'labelsLoaded':
      return event.period === state.query.period
        ? { ...state, labels: event.labels, labelsPeriod: event.period, labelsStatus: 'idle' }
        : state;

    case 'labelsFailed':
      return event.period === state.query.period ? { ...state, labelsStatus: 'error' } : state;
  }
}

/** What the table shows: dimmed while a page loads, the error only for a failed page. */
export function tableStatus(state: ContributorsTableState): 'idle' | 'loading' | 'error' {
  if (state.pending) {
    return 'loading';
  }

  return state.failed ? 'error' : 'idle';
}

/** The labels the select offers for the current period: `null` until they are known. */
export function currentLabels(state: ContributorsTableState): string[] | null {
  return state.labelsPeriod === state.query.period ? state.labels : null;
}
