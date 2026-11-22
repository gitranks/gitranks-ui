'use client';

import dynamic from 'next/dynamic';
import type { FC } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { PackageDownloadsPoint } from '@/graphql/package-page';
import type { DownloadsUnit } from '@/lib/packages/registries';
import { formatNumberShort } from '@/utils/format-number-short';

type DownloadsChartProps = {
  points: readonly PackageDownloadsPoint[];
  /** What a point counts: a week (from its Monday) or a calendar month. */
  unit?: DownloadsUnit;
  /** What the chart shows, for assistive tech: its range and its total. */
  label: string;
};

type ChartPoint = { time: number; downloads: number };

const TICK_FORMATTER = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DATE_FORMATTER = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "Week of Nov 9, 2026", "October 2026": what one point counts. */
const pointLabel = (time: number, unit: DownloadsUnit) =>
  unit === 'month' ? MONTH_FORMATTER.format(time) : `Week of ${DATE_FORMATTER.format(time)}`;

// Mono numbers in the muted ink, like the star history's chart.
const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' };

const DownloadsTooltip: FC<{ active?: boolean; payload?: Array<{ payload?: ChartPoint }>; unit: DownloadsUnit }> = ({
  active,
  payload,
  unit,
}) => {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) {
    return null;
  }
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
      <div>{pointLabel(point.time, unit)}</div>
      <div className="font-mono font-semibold tabular-nums">{point.downloads.toLocaleString('en-US')} downloads</div>
    </div>
  );
};

/** Weekly or monthly downloads as a line over the points given, drawn with the star history's chart parts. */
const DownloadsChart: FC<DownloadsChartProps> = ({ points, unit = 'week', label }) => {
  const data: ChartPoint[] = points.map(({ start, downloads }) => ({ time: new Date(start).getTime(), downloads }));
  if (data.length < 2) {
    return null;
  }

  return (
    <div
      role="img"
      aria-label={label}
      className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="package-downloads-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tick={AXIS_TICK}
            tickFormatter={(value) => TICK_FORMATTER.format(value)}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={AXIS_TICK}
            tickFormatter={formatNumberShort}
          />
          <Tooltip content={<DownloadsTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey="downloads"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#package-downloads-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default dynamic(() => Promise.resolve(DownloadsChart), { ssr: false });
