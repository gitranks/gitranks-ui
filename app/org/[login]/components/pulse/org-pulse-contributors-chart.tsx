'use client';

import { type FC, useMemo } from 'react';
import { Bar, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCount, formatMonth, type OrgPulseSeriesData, toContributorRows } from './org-pulse.utils';
import { ChartFrame, countAxisProps, monthAxisProps, Swatch, TooltipBox } from './org-pulse-chart-parts';
import { ChartError, ChartLoading } from './org-pulse-code-charts';
import { type ContributorsViewState, useOrgPulseSeries } from './org-pulse-series-provider';

const LINKED_COLOR = 'var(--series-1)';
const ANONYMOUS_COLOR = 'var(--series-other)';
const NEW_COLOR = 'var(--series-2)';

type Row = ReturnType<typeof toContributorRows>[number];

const ContributorsTooltip: FC<{ active?: boolean; payload?: Array<{ payload?: Row }> }> = ({ active, payload }) => {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  return (
    <TooltipBox>
      <div className="font-semibold">{formatMonth(row.month)}</div>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        <li className="flex items-center gap-2">
          <Swatch color={LINKED_COLOR} />
          <span className="grow">Active, linked to a GitHub account</span>
          <span className="tabular-nums">{formatCount(row.linked)}</span>
        </li>
        <li className="flex items-center gap-2">
          <Swatch color={ANONYMOUS_COLOR} />
          <span className="grow">Active, unlinked authors</span>
          <span className="tabular-nums">{formatCount(row.anonymous)}</span>
        </li>
        <li className="flex items-center gap-2">
          <Swatch color={NEW_COLOR} />
          <span className="grow">First-time</span>
          <span className="tabular-nums">{row.newContributors === null ? '—' : formatCount(row.newContributors)}</span>
        </li>
      </ul>
    </TooltipBox>
  );
};

export const ContributorsChart: FC<{ series: OrgPulseSeriesData }> = ({ series }) => {
  const rows = useMemo(() => toContributorRows(series), [series]);
  const first = formatMonth(series.months[0] ?? '');
  const last = formatMonth(series.months.at(-1) ?? '');

  return (
    <ChartFrame
      label={`Contributors per month, ${first} to ${last}: stacked bars of active contributors (linked accounts and unlinked authors) and a line of first-time contributors from the window's 13th month.`}
    >
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="15%">
        <XAxis {...monthAxisProps(series.months)} />
        <YAxis {...countAxisProps} />
        <Bar dataKey="linked" name="Linked" stackId="active" fill={LINKED_COLOR} isAnimationActive={false} />
        <Bar dataKey="anonymous" name="Unlinked" stackId="active" fill={ANONYMOUS_COLOR} isAnimationActive={false} />
        <Line
          dataKey="newContributors"
          name="First-time"
          type="linear"
          stroke={NEW_COLOR}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={<ContributorsTooltip />}
          cursor={{ fill: 'var(--muted-foreground)', fillOpacity: 0.12 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartFrame>
  );
};

export const ContributorsChartView: FC<{ state: ContributorsViewState; onRetry: () => void }> = ({
  state,
  onRetry,
}) => {
  if (state.status === 'loading') {
    return <ChartLoading label="Loading the contributors chart" />;
  }

  if (state.status === 'error') {
    return <ChartError what="The contributors chart" onRetry={onRetry} />;
  }

  if (state.status === 'empty') {
    return <p className="py-4 text-sm text-muted-foreground">No monthly data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ContributorsChart series={state.series} />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <Swatch color={LINKED_COLOR} /> Active, linked to a GitHub account
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color={ANONYMOUS_COLOR} /> Active, unlinked authors
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color={NEW_COLOR} className="h-0.5" /> First-time, from the 13th month of the window
        </li>
      </ul>
    </div>
  );
};

export const OrgPulseContributorsChart: FC = () => {
  const { contributors, retry } = useOrgPulseSeries();

  return <ContributorsChartView state={contributors} onRetry={retry} />;
};
