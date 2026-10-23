'use client';

import NextLink from 'next/link';
import { type FC, useEffect, useId, useRef, useState } from 'react';

import {
  avatarSrc,
  CONTRIBUTORS_PAGE_SIZE,
  formatCount,
  type OrgPulseContributorRow,
  PERIOD_OPTIONS,
  plural,
  SORT_OPTIONS,
} from './org-pulse.utils';
import { useHydrated } from './use-hydrated';
import { ButtonGroup, ButtonGroupItem } from '@/components/button-group/button-group';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { cn } from '@/lib/utils';
import { OrgPulseContributorSort, OrgPulseContributorsDocument, OrgPulsePeriod } from '@/types/generated/graphql';

const ALL_LABELS = '__all';
const AVATAR_SIZE = 24;

export type ContributorsQuery = { period: OrgPulsePeriod; sortBy: OrgPulseContributorSort; label: string | null };

export type ContributorsTableData = {
  items: OrgPulseContributorRow[];
  /** Rows the API holds for the query; unknown until the first client request. */
  total: number | null;
  unlinkedAuthors: number;
  /** The Language labels the period can be filtered by; unknown until the first client request. */
  labels: string[] | null;
};

type ContributorsTableViewProps = {
  query: ContributorsQuery;
  data: ContributorsTableData;
  /** How many of the loaded rows are shown. */
  visible: number;
  status: 'idle' | 'loading' | 'error';
  /** False while the page is not hydrated yet: the controls are left out. */
  interactive?: boolean;
  onQueryChange: (query: ContributorsQuery) => void;
  onShowMore: () => void;
  onRetry: () => void;
};

const periodLong = (period: OrgPulsePeriod) => PERIOD_OPTIONS.find((option) => option.value === period)?.long ?? '';
const sortLong = (sortBy: OrgPulseContributorSort) =>
  SORT_OPTIONS.find((option) => option.value === sortBy)?.long ?? '';

/**
 * Cell styles live on the table, not on each cell: the first rows are server-rendered on every
 * covered org's page, so per-cell class lists would repeat in its HTML.
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
 * The top contributors: raw counts per account, in the API's order for the chosen sort. No rank
 * column and no score; unlinked authors are counted under the table, never listed. The controls
 * render only once `interactive` (after hydration): without a script they do nothing, and the
 * server-rendered page stays small.
 */
export const ContributorsTableView: FC<ContributorsTableViewProps> = ({
  query,
  data,
  visible,
  status,
  interactive = true,
  onQueryChange,
  onShowMore,
  onRetry,
}) => {
  const labelId = useId();
  const { period, sortBy, label } = query;
  const rows = data.items.slice(0, visible);
  const known = data.total ?? data.items.length;
  const canShowMore = visible < known || (data.total === null && data.items.length >= visible);
  const sortedBy = label ? OrgPulseContributorSort.Lines : sortBy;
  const sortOf = (column: OrgPulseContributorSort) => (sortedBy === column ? 'descending' : undefined);
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
          {!!data.labels?.length && (
            <div className="flex items-center gap-2">
              <span id={labelId}>Language</span>
              <Select
                value={label ?? ALL_LABELS}
                onValueChange={(value) => onQueryChange({ ...query, label: value === ALL_LABELS ? null : value })}
              >
                <SelectTrigger size="sm" className="min-w-36" aria-labelledby={labelId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LABELS}>All languages</SelectItem>
                  {data.labels.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : (
        <div aria-hidden className="h-8" />
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
              <th scope="col" aria-sort={sortOf(OrgPulseContributorSort.Lines)}>
                Added
              </th>
              <th scope="col" className={sortedBy === OrgPulseContributorSort.Lines ? 'text-foreground' : undefined}>
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
                  <NextLink
                    href={`/profile/${row.login}`}
                    prefetch={false}
                    className="inline-flex items-center gap-2 hover:underline"
                    translate="no"
                  >
                    <img
                      src={avatarSrc(row.avatarUrl, AVATAR_SIZE)}
                      alt=""
                      width={AVATAR_SIZE}
                      height={AVATAR_SIZE}
                      loading="lazy"
                      className="rounded-full bg-muted"
                    />
                    {row.login}
                  </NextLink>
                  {!!row.topLabels.length && (
                    <div className="pl-8 text-xs text-muted-foreground">{row.topLabels.join(', ')}</div>
                  )}
                </th>
                <td>{formatCount(row.linesAdded)}</td>
                <td>{formatCount(row.linesDeleted)}</td>
                <td>{formatCount(row.commits)}</td>
                <td>{formatCount(row.pullRequests)}</td>
                <td>{formatCount(row.activeMonths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && status !== 'loading' && status !== 'error' && (
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
        <span>
          {data.unlinkedAuthors > 0
            ? `${plural(data.unlinkedAuthors, 'unlinked author')} (no GitHub account found) not listed.`
            : null}
        </span>
        {interactive && canShowMore && status !== 'error' && (
          <Button variant="outline" size="sm" onClick={onShowMore} disabled={status === 'loading'}>
            Show more
          </Button>
        )}
      </div>
    </div>
  );
};

type OrgPulseContributorsTableProps = {
  login: string;
  /** The server-rendered first rows: last 12 months by lines. */
  initialItems: OrgPulseContributorRow[];
  initialUnlinkedAuthors: number;
};

const DEFAULT_QUERY: ContributorsQuery = {
  period: OrgPulsePeriod.Last_12Months,
  sortBy: OrgPulseContributorSort.Lines,
  label: null,
};

/**
 * Starts from the server-rendered rows, then loads the first page in the browser for the label list
 * and the row count. "Show more" adds a page at a time, up to what the API holds.
 */
export const OrgPulseContributorsTable: FC<OrgPulseContributorsTableProps> = ({
  login,
  initialItems,
  initialUnlinkedAuthors,
}) => {
  const [query, setQuery] = useState<ContributorsQuery>(DEFAULT_QUERY);
  const [data, setData] = useState<ContributorsTableData>({
    items: initialItems,
    total: null,
    unlinkedAuthors: initialUnlinkedAuthors,
    labels: null,
  });
  const [visible, setVisible] = useState(initialItems.length || CONTRIBUTORS_PAGE_SIZE);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [failed, setFailed] = useState<{ query: ContributorsQuery; offset: number } | null>(null);
  const request = useRef(0);
  const hydrated = useHydrated();

  const load = (next: ContributorsQuery, offset: number) => {
    const id = ++request.current;
    setStatus('loading');

    graphqlClient(OrgPulseContributorsDocument, {
      login,
      period: next.period,
      sortBy: next.sortBy,
      label: next.label,
      first: CONTRIBUTORS_PAGE_SIZE,
      offset,
    })
      .then((response) => {
        if (id !== request.current) {
          return;
        }

        const page = response?.organization?.pulseContributors;
        setData((prev) => ({
          items: offset ? [...prev.items, ...(page?.items ?? [])] : (page?.items ?? []),
          total: page?.total ?? 0,
          unlinkedAuthors: page?.unlinkedAuthors ?? 0,
          labels: page?.labels ?? prev.labels,
        }));
        setFailed(null);
        setStatus('idle');
      })
      .catch((error: unknown) => {
        if (id !== request.current) {
          return;
        }

        console.error('Error loading the org contributors:', error);
        setFailed({ query: next, offset });
        setStatus('error');
      });
  };

  // The first page: the label list and the row count the server-rendered rows lack.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per org
  useEffect(() => {
    load(DEFAULT_QUERY, 0);
  }, [login]);

  const handleQueryChange = (next: ContributorsQuery) => {
    setQuery(next);
    setVisible(CONTRIBUTORS_PAGE_SIZE);
    load(next, 0);
  };

  const handleShowMore = () => {
    const nextVisible = visible + CONTRIBUTORS_PAGE_SIZE;
    setVisible(nextVisible);

    if (nextVisible > data.items.length && (data.total === null || data.items.length < data.total)) {
      load(query, data.items.length);
    }
  };

  const handleRetry = () => {
    if (failed) {
      load(failed.query, failed.offset);
    }
  };

  return (
    <ContributorsTableView
      interactive={hydrated}
      query={query}
      data={data}
      visible={visible}
      status={status}
      onQueryChange={handleQueryChange}
      onShowMore={handleShowMore}
      onRetry={handleRetry}
    />
  );
};
