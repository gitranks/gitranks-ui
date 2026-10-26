'use client';

import { type FC, useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';

import {
  addedKey,
  deletedKey,
  formatCount,
  formatMonth,
  formatShare,
  formatSigned,
  type MonthRow,
  monthInflow,
  monthSnapshot,
  type PulseSeriesData,
  seriesColor,
  snapshotKey,
  toInflowRows,
  toSnapshotRows,
} from './pulse.utils';
import { ChartFrame, countAxisProps, monthAxisProps, Swatch, TooltipBox } from './pulse-chart-parts';
import { cn } from '@/lib/utils';

/** The two lines charts share one tooltip position: hovering a month in one shows it in both. */
const SYNC_ID = 'pulse-lines';

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: MonthRow }>;
  series: PulseSeriesData;
};

const SnapshotTooltip: FC<TooltipProps> = ({ active, payload, series }) => {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  const { labels, total } = monthSnapshot(series, row.index);

  return (
    <TooltipBox>
      <div className="font-semibold">Lines at the end of {formatMonth(row.month)}</div>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {labels.map(({ label, index, lines }) => (
          <li key={label} className="flex items-center gap-2">
            <Swatch color={seriesColor(label, index)} />
            <span className="grow">{label}</span>
            <span className="tabular-nums">{formatCount(lines)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex justify-between gap-2 border-t pt-1.5 font-medium">
        <span>Total</span>
        <span className="tabular-nums">{formatCount(total)}</span>
      </div>
    </TooltipBox>
  );
};

const InflowTooltip: FC<TooltipProps> = ({ active, payload, series }) => {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  const month = monthInflow(series, row.index);
  const moved = month.labels.filter(({ added, deleted }) => added !== 0 || deleted !== 0);

  return (
    <TooltipBox>
      <div className="font-semibold">{formatMonth(row.month)}</div>
      <div className="text-muted-foreground">
        {formatCount(month.commits)} human {month.commits === 1 ? 'commit' : 'commits'} ·{' '}
        {formatCount(month.pullRequests)} human {month.pullRequests === 1 ? 'PR' : 'PRs'}
      </div>
      {moved.length ? (
        <table className="mt-1.5 w-full">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="text-left font-normal">
                <span className="sr-only">Label</span>
              </th>
              <th scope="col" className="text-right font-normal pl-2">
                Added
              </th>
              <th scope="col" className="text-right font-normal pl-2">
                Deleted
              </th>
              <th scope="col" className="text-right font-normal pl-2">
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {moved.map(({ label, index, added, deleted, net }) => (
              <tr key={label}>
                <th scope="row" className="text-left font-normal">
                  <span className="flex items-center gap-1.5">
                    <Swatch color={seriesColor(label, index)} />
                    {label}
                  </span>
                </th>
                <td className="text-right tabular-nums pl-2 text-positive">+{formatCount(added)}</td>
                <td className="text-right tabular-nums pl-2 text-negative">−{formatCount(deleted)}</td>
                <td className="text-right tabular-nums pl-2">{formatSigned(net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <th scope="row" className="text-left pt-1">
                Month
              </th>
              <td className="text-right tabular-nums pl-2 pt-1 text-positive">+{formatCount(month.added)}</td>
              <td className="text-right tabular-nums pl-2 pt-1 text-negative">−{formatCount(month.deleted)}</td>
              <td className="text-right tabular-nums pl-2 pt-1">{formatSigned(month.net)}</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div className="mt-1.5 text-muted-foreground">No counted lines</div>
      )}
      {month.largest && (
        <div className="mt-1.5">
          Largest single change: {formatCount(month.largest.lines)} lines ({formatShare(month.largest.share)} of this
          month)
        </div>
      )}
      {month.crossLines > 0 && (
        <div className="mt-0.5 text-muted-foreground">Files crossing 100 KB: {formatCount(month.crossLines)} lines</div>
      )}
    </TooltipBox>
  );
};

type ChartProps = {
  series: PulseSeriesData;
  /** The grouping's name, lowercase, for the figures' labels. */
  grouping: string;
};

const range = (series: PulseSeriesData) =>
  `${series.months.length} months from ${formatMonth(series.months[0] ?? '')} to ${formatMonth(series.months.at(-1) ?? '')}`;

export const LinesSnapshotChart: FC<ChartProps> = ({ series, grouping }) => {
  const rows = useMemo(() => toSnapshotRows(series), [series]);

  return (
    <ChartFrame
      label={`Lines snapshot: a stacked area chart of lines of code by ${grouping} at each month end, ${range(series)}.`}
    >
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId={SYNC_ID}>
        <XAxis {...monthAxisProps(series.months)} />
        <YAxis {...countAxisProps} />
        {series.labels.map((label, l) => (
          <Area
            key={label}
            dataKey={snapshotKey(l)}
            name={label}
            stackId="snapshot"
            type="linear"
            fill={seriesColor(label, l)}
            fillOpacity={0.9}
            stroke="var(--card)"
            strokeWidth={1}
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
        <Tooltip
          content={<SnapshotTooltip series={series} />}
          cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeOpacity: 0.5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartFrame>
  );
};

export const LinesInflowChart: FC<ChartProps> = ({ series, grouping }) => {
  const rows = useMemo(() => toInflowRows(series), [series]);

  return (
    <ChartFrame
      label={`Lines inflow: stacked bars of lines added (above the axis) and deleted (below it) each month by ${grouping}, ${range(series)}.`}
    >
      <BarChart
        data={rows}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        stackOffset="sign"
        barCategoryGap="15%"
        syncId={SYNC_ID}
      >
        <XAxis {...monthAxisProps(series.months)} />
        <YAxis {...countAxisProps} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
        {series.labels.map((label, l) => (
          <Bar
            key={`added-${label}`}
            dataKey={addedKey(l)}
            name={`${label} added`}
            stackId="inflow"
            fill={seriesColor(label, l)}
            isAnimationActive={false}
          />
        ))}
        {series.labels.map((label, l) => (
          <Bar
            key={`deleted-${label}`}
            dataKey={deletedKey(l)}
            name={`${label} deleted`}
            stackId="inflow"
            fill={seriesColor(label, l)}
            fillOpacity={0.5}
            isAnimationActive={false}
          />
        ))}
        <Tooltip
          content={<InflowTooltip series={series} />}
          cursor={{ fill: 'var(--muted-foreground)', fillOpacity: 0.12 }}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
};

export const InflowKey: FC<{ className?: string }> = ({ className }) => (
  <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
    <span className="flex items-center gap-1.5">
      <Swatch color="var(--muted-foreground)" /> Added, above the axis
    </span>
    <span className="flex items-center gap-1.5">
      <Swatch color="var(--muted-foreground)" faded /> Deleted, below it
    </span>
  </p>
);
