import NextLink from 'next/link';
import { type FC, useEffect, useId, useReducer } from 'react';

import { avatarSrc, formatCount, PERIOD_OPTIONS, type PulseContributorRow, plural, SORT_OPTIONS } from './pulse.utils';
import {
  type ContributorsTableState,
  canShowMore,
  contributorsTableReducer,
  currentLabels,
  initialTableState,
  type LoadContributorsPage,
  tableStatus,
} from './pulse-contributors-table.state';
import { useHydrated } from './use-hydrated';
import { ButtonGroup, ButtonGroupItem } from '@/components/button-group/button-group';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { OrgPulseContributorSort, type OrgPulsePeriod } from '@/types/generated/graphql';
import type { ContributorsQuery } from '@/types/pulse.types';

const ALL_LABELS = '__all';
const AVATAR_SIZE = 24;

type ContributorsTableViewProps = {
  state: ContributorsTableState;
  /** False while the page is not hydrated yet: the controls are left out, their space kept. */
  interactive?: boolean;
  onQueryChange: (query: ContributorsQuery) => void;
  onShowMore: () => void;
  onRetry: () => void;
  /** The Language select opened: its labels load then, unless known. */
  onLabelsWanted: () => void;
};

const periodLong = (period: OrgPulsePeriod) => PERIOD_OPTIONS.find((option) => option.value === period)?.long ?? '';
const sortLong = (sortBy: OrgPulseContributorSort) =>
  SORT_OPTIONS.find((option) => option.value === sortBy)?.long ?? '';

/**
 * Cell styles live on the table, not on each cell: the first rows are server-rendered on every
 * covered page, so per-cell class lists would repeat in its HTML.
 */
const TABLE_CLASSNAME = cn(
  'w-full text-sm',
  '[&_thead]:text-xs [&_thead]:text-muted-foreground [&_thead_th]:pb-1 [&_thead_th]:pl-3 [&_thead_th]:text-right [&_thead_th]:font-normal',
  '[&_thead_th:first-child]:pl-0 [&_thead_th:first-child]:text-left [&_th[aria-sort]]:text-foreground',
  '[&_tbody_tr]:border-t [&_tbody_th]:py-1.5 [&_tbody_th]:text-left [&_tbody_th]:font-normal',
  '[&_td]:py-1.5 [&_td]:pl-3 [&_td]:text-right [&_td]:tabular-nums [&_td]:whitespace-nowrap',
  '[&_td:nth-child(2)]:text-positive [&_td:nth-child(3)]:text-negative',
  '[&_td:nth-child(6)]:hidden [&_th:nth-child(6)]:hidden sm:[&_td:nth-child(6)]:table-cell sm:[&_th:nth-child(6)]:table-cell',
);

/**
 * A contributor with landed changes but no counted line: everything they touched is outside the line count (files over
 * 100 KB, binary, vendored, generated or lock files). A 0 there would read as "changed nothing".
 */
const hasUncountedLines = (row: PulseContributorRow) =>
  !row.linesAdded && !row.linesDeleted && (row.commits > 0 || row.pullRequests > 0);

const UNCOUNTED_NOTE =
  "No counted lines: files over 100 KB, binary, vendored, generated and lock files aren't counted.";

/** A lines cell: the count, or a muted dash when the row's lines were not counted. */
const LinesCell: FC<{ value: number; uncounted: boolean }> = ({ value, uncounted }) => (
  <td>
    {uncounted ? (
      <span className="text-muted-foreground" title={UNCOUNTED_NOTE}>
        —
      </span>
    ) : (
      formatCount(value)
    )}
  </td>
);

/** The contributor's name: their gitranks profile when gitranks holds it, else their GitHub page (not followed). */
const ContributorName: FC<{ row: PulseContributorRow }> = ({ row }) => {
  const content = (
    <>
      <img
        src={avatarSrc(row.avatarUrl, AVATAR_SIZE)}
        alt=""
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        loading="lazy"
        className="rounded-full bg-muted"
      />
      {row.login}
    </>
  );

  return row.hasProfile ? (
    <NextLink
      href={`/profile/${row.login}`}
      prefetch={false}
      className="inline-flex items-center gap-2 hover:underline"
      translate="no"
    >
      {content}
    </NextLink>
  ) : (
    <a
      href={`https://github.com/${row.login}`}
      rel="nofollow noopener"
      className="inline-flex items-center gap-2 hover:underline"
      translate="no"
    >
      {content}
    </a>
  );
};

/**
 * Before hydration: the controls' rows, kept empty so nothing moves when they appear. The blocks are
 * the controls' widths (period, sort, language), so they wrap the same way on a phone.
 */
const ControlsPlaceholder: FC = () => (
  <div aria-hidden className="flex flex-wrap gap-x-4 gap-y-2 [&>div]:h-8 [&>div]:max-w-full">
    <div className="w-[19.5rem]" />
    <div className="w-[14.75rem]" />
    <div className="w-[13.75rem]" />
  </div>
);

/**
 * The top contributors: raw counts per account, in the API's order for the chosen sort. No rank
 * column and no score; unlinked authors are counted under the table, never listed. The controls
 * render only once `interactive` (after hydration): without a script they do nothing, and the
 * server-rendered page stays small.
 */
export const ContributorsTableView: FC<ContributorsTableViewProps> = ({
  state,
  interactive = true,
  onQueryChange,
  onShowMore,
  onRetry,
  onLabelsWanted,
}) => {
  const labelId = useId();
  const { query } = state;
  const { period, sortBy, label } = query;
  const status = tableStatus(state);
  const labels = currentLabels(state);
  // A row with no login has nothing to show or link to.
  const rows = state.items.slice(0, state.visible).filter((row) => !!row.login);
  const sortedBy = label ? OrgPulseContributorSort.Lines : sortBy;
  // Lines are added + deleted, which no single column holds: the caption names that sort.
  const sortOf = (column: OrgPulseContributorSort) =>
    column !== OrgPulseContributorSort.Lines && sortedBy === column ? 'descending' : undefined;
  const linesClassName = sortedBy === OrgPulseContributorSort.Lines ? 'text-foreground' : undefined;
  const caption = label
    ? `Contributors with the most ${label} lines (added + deleted), ${periodLong(period)}. Lines columns count ${label} only.`
    : `Contributors by ${sortLong(sortBy)}, ${periodLong(period)}.`;

  return (
    <div className="flex flex-col gap-3">
      {interactive ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <fieldset className="flex items-center gap-2 min-w-0">
            <legend className="sr-only">Period</legend>
            <span aria-hidden>Period</span>
            <ButtonGroup>
              {PERIOD_OPTIONS.map((option) => (
                <ButtonGroupItem
                  key={option.value}
                  active={option.value === period}
                  onClick={() => onQueryChange({ ...query, period: option.value, label: null })}
                >
                  {option.label}
                </ButtonGroupItem>
              ))}
            </ButtonGroup>
          </fieldset>
          {!label && (
            <fieldset className="flex items-center gap-2 min-w-0">
              <legend className="sr-only">Sort by</legend>
              <span aria-hidden>Sort by</span>
              <ButtonGroup>
                {SORT_OPTIONS.map((option) => (
                  <ButtonGroupItem
                    key={option.value}
                    active={option.value === sortBy}
                    onClick={() => onQueryChange({ ...query, sortBy: option.value })}
                  >
                    {option.label}
                  </ButtonGroupItem>
                ))}
              </ButtonGroup>
            </fieldset>
          )}
          <div className="flex items-center gap-2">
            <span id={labelId}>Language</span>
            <Select
              value={label ?? ALL_LABELS}
              onValueChange={(value) => onQueryChange({ ...query, label: value === ALL_LABELS ? null : value })}
              onOpenChange={(open) => open && onLabelsWanted()}
            >
              <SelectTrigger size="sm" className="min-w-36" aria-labelledby={labelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LABELS}>All languages</SelectItem>
                {labels?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                {label && !labels?.includes(label) && <SelectItem value={label}>{label}</SelectItem>}
                {!labels && (
                  <SelectItem value="__loading" disabled>
                    {state.labelsStatus === 'error' ? "Languages couldn't load" : 'Loading languages…'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <ControlsPlaceholder />
      )}

      <div
        className={cn('overflow-x-auto transition-opacity', status === 'loading' && 'opacity-60')}
        aria-busy={status === 'loading'}
      >
        <table className={TABLE_CLASSNAME}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Contributor</th>
              <th scope="col" className={linesClassName}>
                Added
              </th>
              <th scope="col" className={linesClassName}>
                Deleted
              </th>
              <th scope="col" aria-sort={sortOf(OrgPulseContributorSort.Commits)}>
                Commits
              </th>
              <th scope="col" aria-sort={sortOf(OrgPulseContributorSort.PullRequests)}>
                PRs
              </th>
              <th scope="col">Active months</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.githubId ?? row.login}>
                <th scope="row">
                  <ContributorName row={row} />
                  {!!row.topLabels.length && (
                    <div className="pl-8 text-xs text-muted-foreground">{row.topLabels.join(', ')}</div>
                  )}
                </th>
                <LinesCell value={row.linesAdded} uncounted={hasUncountedLines(row)} />
                <LinesCell value={row.linesDeleted} uncounted={hasUncountedLines(row)} />
                <td>{formatCount(row.commits)}</td>
                <td>{formatCount(row.pullRequests)}</td>
                <td>{formatCount(row.activeMonths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && status === 'idle' && (
          <p className="py-4 text-sm text-muted-foreground">No linked contributors in this period.</p>
        )}
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 text-sm">
          <span>The contributors couldn&apos;t load.</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex flex-col gap-1">
          {state.unlinkedAuthors > 0 && (
            <span>{plural(state.unlinkedAuthors, 'unlinked author')} (no GitHub account found) not listed.</span>
          )}
          {rows.some(hasUncountedLines) && <span>— {UNCOUNTED_NOTE}</span>}
        </span>
        {interactive && canShowMore(state) && status !== 'error' && (
          <Button variant="outline" size="sm" onClick={onShowMore} disabled={state.live && !!state.pending}>
            Show more
          </Button>
        )}
      </div>
    </div>
  );
};

type PulseContributorsTableProps = {
  /** The server-rendered first rows: last 12 months by lines. */
  initialItems: PulseContributorRow[];
  initialUnlinkedAuthors: number;
  /** Must keep its identity across renders: a new one loads the pending page again. */
  loadPage: LoadContributorsPage;
};

/**
 * Starts from the server-rendered rows and loads nothing until asked: a control or "Show more"
 * loads a page, and opening the Language select loads its labels. The paging is
 * `contributorsTableReducer`; this runs the requests it asks for.
 */
export const PulseContributorsTable: FC<PulseContributorsTableProps> = ({
  initialItems,
  initialUnlinkedAuthors,
  loadPage,
}) => {
  const [state, dispatch] = useReducer(contributorsTableReducer, undefined, () =>
    initialTableState(initialItems, initialUnlinkedAuthors),
  );
  const hydrated = useHydrated();
  const { pending, labelsStatus } = state;
  const period: OrgPulsePeriod = state.query.period;

  useEffect(() => {
    if (!pending) {
      return;
    }

    loadPage(pending.query, pending.offset, pending.first)
      .then((page) =>
        dispatch({
          type: 'loaded',
          id: pending.id,
          page: page ?? { total: 0, unlinkedAuthors: 0, labels: [], items: [] },
        }),
      )
      .catch((error: unknown) => {
        console.error('Error loading the contributors:', error);
        dispatch({ type: 'failed', id: pending.id });
      });
  }, [loadPage, pending]);

  // The labels alone: a page of no rows. A failure shows only in the select.
  // biome-ignore lint/correctness/useExhaustiveDependencies: one request per labels load
  useEffect(() => {
    if (labelsStatus !== 'loading') {
      return;
    }

    loadPage({ ...state.query, label: null }, 0, 0)
      .then((page) => dispatch({ type: 'labelsLoaded', period, labels: page?.labels ?? [] }))
      .catch(() => dispatch({ type: 'labelsFailed', period }));
  }, [loadPage, labelsStatus, period]);

  return (
    <ContributorsTableView
      state={state}
      interactive={hydrated}
      onQueryChange={(query) => dispatch({ type: 'query', query })}
      onShowMore={() => dispatch({ type: 'showMore' })}
      onRetry={() => dispatch({ type: 'retry' })}
      onLabelsWanted={() => dispatch({ type: 'labelsRequested' })}
    />
  );
};
