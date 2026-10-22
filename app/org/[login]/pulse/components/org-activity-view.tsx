import { format } from 'date-fns';
import type { FC, ReactNode } from 'react';

import {
  formatMonth,
  formatShare,
  GROUP_BY_OPTIONS,
  LOW_VOLUME_COMMITS,
  monthHasData,
  type OrgActivityData,
  OTHER_SERIES_LABEL,
  seriesColor,
} from './org-activity.utils';
import { OrgActivityAreaChart } from './org-activity-chart';
import { ProfileCard, ProfileCardContent } from '@/app/profile/[login]/components/profile-card';
import { ButtonGroup, ButtonGroupItem } from '@/components/button-group/button-group';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OrgActivityGroupBy } from '@/types/generated/graphql';

export type OrgActivityViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  /** `groupBy` is the chart's own grouping: while the next one loads, the last chart stays. */
  | { status: 'loaded'; chart: OrgActivityData; groupBy: OrgActivityGroupBy; refreshing?: boolean };

type OrgActivityViewProps = {
  groupBy: OrgActivityGroupBy;
  state: OrgActivityViewState;
  onGroupByChange: (groupBy: OrgActivityGroupBy) => void;
  onRetry: () => void;
};

const groupByLabel = (groupBy: OrgActivityGroupBy) =>
  GROUP_BY_OPTIONS.find((option) => option.value === groupBy)?.label ?? 'Type';

const shareOrDash = (chart: OrgActivityData, seriesIndex: number, monthIndex: number) =>
  monthHasData(chart, monthIndex) ? formatShare(chart.series[seriesIndex]?.shares[monthIndex] ?? 0) : '—';

const Note: FC<{ children: ReactNode; swatch?: ReactNode }> = ({ children, swatch }) => (
  <li className="flex items-start gap-2">
    {swatch}
    <span>{children}</span>
  </li>
);

const HatchSwatch: FC = () => (
  <span
    aria-hidden
    className="mt-0.5 size-3 shrink-0 rounded-sm border"
    style={{
      backgroundImage: 'repeating-linear-gradient(45deg, var(--muted-foreground) 0 1.5px, transparent 1.5px 4px)',
    }}
  />
);

const LoadedChart: FC<{ chart: OrgActivityData; groupBy: OrgActivityGroupBy; refreshing?: boolean }> = ({
  chart,
  groupBy,
  refreshing,
}) => {
  const firstIndex = 0;
  const lastIndex = chart.months.length - 1;
  const firstMonth = formatMonth(chart.months[firstIndex] ?? '');
  const lastMonth = formatMonth(chart.months[lastIndex] ?? '');
  const hasOtherSeries = chart.series.some((series) => series.label === OTHER_SERIES_LABEL);
  const hasLowVolume = chart.lowVolume.some(Boolean);
  const computedAt = chart.computedAt ? new Date(chart.computedAt) : null;
  const chartLabel = `Activity by ${groupByLabel(groupBy).toLowerCase()}: a 100% stacked area chart of each month's share of changed files by ${groupByLabel(groupBy).toLowerCase()}, ${chart.months.length} months from ${firstMonth} to ${lastMonth}. The table below lists each series' share in the first and last month.`;

  return (
    <div className={cn('flex flex-col gap-4 transition-opacity', refreshing && 'opacity-60')} aria-busy={refreshing}>
      <figure aria-label={chartLabel} className="m-0 -ml-2">
        <OrgActivityAreaChart chart={chart} />
      </figure>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Share of changed files by {groupByLabel(groupBy).toLowerCase()} in the first and last month
          </caption>
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th scope="col" className="text-left font-normal pb-1">
                {groupByLabel(groupBy)}
              </th>
              <th scope="col" className="text-right font-normal pb-1 pl-3 whitespace-nowrap">
                {firstMonth}
              </th>
              <th scope="col" className="text-right font-normal pb-1 pl-3 whitespace-nowrap">
                {lastMonth}
              </th>
            </tr>
          </thead>
          <tbody>
            {chart.series.map((series, s) => (
              <tr key={series.label} className="border-t">
                <th scope="row" className="text-left font-normal py-1">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: seriesColor(series.label, s) }}
                    />
                    {series.label}
                  </span>
                </th>
                <td className="text-right tabular-nums py-1 pl-3">{shareOrDash(chart, s, firstIndex)}</td>
                <td className="text-right tabular-nums py-1 pl-3">{shareOrDash(chart, s, lastIndex)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
        {hasLowVolume && (
          <Note swatch={<HatchSwatch />}>Hatched: months with fewer than {LOW_VOLUME_COMMITS} commits.</Note>
        )}
        {hasOtherSeries && <Note>“{OTHER_SERIES_LABEL}” sums every label outside the ones listed.</Note>}
        <Note>
          Other / unknown (code files with no known language): {formatShare(chart.otherUnknownShare)} of all changed
          files counted.
        </Note>
        <Note>
          Counted: {chart.scopeNote}. Bot commits are excluded.
          {computedAt && !Number.isNaN(computedAt.getTime()) && <> Updated {format(computedAt, 'MMM d, yyyy')}.</>}
        </Note>
      </ul>
    </div>
  );
};

/** The Pulse tab's *Activity by type* card: data only, no headline or reading of the chart. */
export const OrgActivityView: FC<OrgActivityViewProps> = ({ groupBy, state, onGroupByChange, onRetry }) => {
  const showSwitch = state.status === 'loaded' || state.status === 'loading';

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-lg leading-none">Activity by {groupByLabel(groupBy).toLowerCase()}</h2>
        {showSwitch && (
          <fieldset className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <legend className="sr-only">Group by</legend>
            <span aria-hidden>Group by</span>
            <ButtonGroup>
              {GROUP_BY_OPTIONS.map((option) => (
                <ButtonGroupItem
                  key={option.value}
                  active={option.value === groupBy}
                  onClick={() => onGroupByChange(option.value)}
                >
                  {option.label}
                </ButtonGroupItem>
              ))}
            </ButtonGroup>
          </fieldset>
        )}
      </div>

      <ProfileCardContent className="gap-4">
        {state.status !== 'empty' && (
          <p className="text-sm text-muted-foreground">
            Each month&apos;s share of changed files. A commit counts once, split evenly across the files it changed.
          </p>
        )}

        {state.status === 'loading' && <Skeleton className="h-[280px] w-full" aria-label="Loading the chart" />}

        {state.status === 'error' && (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm">The chart couldn&apos;t load.</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}

        {state.status === 'empty' && (
          <p className="py-6 text-sm text-muted-foreground">This organization isn&apos;t covered yet.</p>
        )}

        {state.status === 'loaded' && (
          <LoadedChart chart={state.chart} groupBy={state.groupBy} refreshing={state.refreshing} />
        )}
      </ProfileCardContent>
    </ProfileCard>
  );
};
