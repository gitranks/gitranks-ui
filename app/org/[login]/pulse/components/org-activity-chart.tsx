'use client';

import { type FC, useId, useMemo } from 'react';
import { Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  type ChartRow,
  formatMonth,
  formatMonthTick,
  formatShare,
  isolatedMonths,
  lowVolumeRanges,
  monthDomain,
  monthTicks,
  type OrgActivityData,
  seriesColor,
  seriesKey,
  seriesTopFirst,
  stackedSegments,
  toChartRows,
} from './org-activity.utils';

type OrgActivityChartProps = {
  chart: OrgActivityData;
};

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
  chart: OrgActivityData;
};

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const CHART_HEIGHT = 280;
/** Half the width of the bar drawn for an isolated month, in month steps. */
const ISOLATED_HALF_WIDTH = 0.3;

const ActivityTooltip: FC<TooltipContentProps> = ({ active, payload, chart }) => {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  const hasData = chart.series.some((_, s) => Number(row[seriesKey(s)] ?? 0) > 0);

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm min-w-44">
      <div className="font-semibold">{formatMonth(row.month)}</div>
      <div className="text-muted-foreground">
        {row.commits.toLocaleString('en-US')} {row.commits === 1 ? 'commit' : 'commits'}
        {row.lowVolume && ' · low volume'}
      </div>
      {hasData ? (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {seriesTopFirst(chart).map(({ series, index: s }) => (
            <li key={series.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: seriesColor(series.label, s) }}
              />
              <span className="grow">{series.label}</span>
              <span className="tabular-nums">{formatShare(Number(row[seriesKey(s)] ?? 0))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1.5 text-muted-foreground">No counted changes</div>
      )}
    </div>
  );
};

export const OrgActivityAreaChart: FC<OrgActivityChartProps> = ({ chart }) => {
  const hatchId = `${useId().replaceAll(':', '')}-low-volume`;
  const rows = useMemo(() => toChartRows(chart), [chart]);
  const ticks = useMemo(() => monthTicks(chart.months), [chart.months]);
  const shaded = useMemo(() => lowVolumeRanges(chart.lowVolume), [chart.lowVolume]);
  const isolated = useMemo(
    () => isolatedMonths(chart).map((month) => ({ month, segments: stackedSegments(chart, month) })),
    [chart],
  );

  // The chart is a tab stop (recharts' accessibility layer moves the tooltip with the arrow keys):
  // the focus ring stays for keyboard focus and is hidden only after a click.
  return (
    <ResponsiveContainer
      width="100%"
      height={CHART_HEIGHT}
      className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring"
    >
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="fill-background" fillOpacity={0.45} />
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-foreground" strokeOpacity={0.35} strokeWidth={2} />
          </pattern>
        </defs>
        <XAxis
          dataKey="index"
          type="number"
          domain={monthDomain(chart.months.length)}
          ticks={ticks}
          tickFormatter={(i: number) => formatMonthTick(chart.months[i] ?? '', chart.months.length)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          minTickGap={12}
          allowDecimals={false}
        />
        <YAxis
          domain={[0, 1]}
          ticks={Y_TICKS}
          tickFormatter={(share: number) => `${Math.round(share * 100)}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          width={40}
        />
        {chart.series.map((series, s) => (
          <Area
            key={series.label}
            dataKey={seriesKey(s)}
            name={series.label}
            stackId="share"
            type="linear"
            fill={seriesColor(series.label, s)}
            fillOpacity={0.9}
            stroke="var(--card)"
            strokeWidth={1}
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
        {/* A month with data between two without has no area to draw: a narrow stacked bar instead. */}
        {isolated.flatMap(({ month, segments }) =>
          segments.map(({ index, y1, y2 }) => (
            <ReferenceArea
              key={`isolated-${month}-${index}`}
              x1={month - ISOLATED_HALF_WIDTH}
              x2={month + ISOLATED_HALF_WIDTH}
              y1={y1}
              y2={y2}
              fill={seriesColor(chart.series[index].label, index)}
              fillOpacity={0.9}
              stroke="var(--card)"
              strokeWidth={1}
              ifOverflow="hidden"
            />
          )),
        )}
        {shaded.map(({ x1, x2 }) => (
          <ReferenceArea
            key={`${x1}-${x2}`}
            x1={x1}
            x2={x2}
            y1={0}
            y2={1}
            fill={`url(#${hatchId})`}
            fillOpacity={1}
            strokeOpacity={0}
            ifOverflow="hidden"
          />
        ))}
        <Tooltip
          content={<ActivityTooltip chart={chart} />}
          cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeOpacity: 0.5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
