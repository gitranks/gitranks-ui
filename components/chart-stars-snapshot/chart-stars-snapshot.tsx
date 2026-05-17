'use client';

import dynamic from 'next/dynamic';
import type { FC } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { cn } from '@/lib/utils';

type ChartStarsSnapshotProps = {
  snapshots?: unknown;
  metric: 's' | 'c';
  className?: string;
};

type SnapshotPoint = {
  time: number;
  date: string;
  value: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: SnapshotPoint }>;
};

const DATE_TICK_FORMATTER = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' });
const DATE_TOOLTIP_FORMATTER = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

const getSnapshotPoints = (snapshots: unknown, metric: 's' | 'c'): SnapshotPoint[] => {
  if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) {
    return [];
  }

  const entries = Object.entries(snapshots as Record<string, unknown>).sort(([dateA], [dateB]) =>
    dateA.localeCompare(dateB),
  );

  let previousTime = 0;

  return entries.map(([date, snapshot], index) => {
    const parsedTime = Date.parse(date);
    const fallbackTime = index === 0 ? Date.now() : previousTime + 24 * 60 * 60 * 1000;
    const time = Number.isFinite(parsedTime) ? parsedTime : fallbackTime;
    previousTime = time;

    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return { date, time, value: 0 };
    }

    const metricValue = (snapshot as Record<string, unknown>)[metric];
    const numericValue = typeof metricValue === 'number' ? metricValue : Number(metricValue);
    const value = Number.isFinite(numericValue) ? numericValue : 0;

    return { date, time, value };
  });
};

const ChartStarsSnapshot: FC<ChartStarsSnapshotProps> = ({ snapshots, metric, className }) => {
  const totalSnapshotKeys =
    snapshots && typeof snapshots === 'object' && !Array.isArray(snapshots) ? Object.keys(snapshots).length : 0;

  if (totalSnapshotKeys < 3) {
    return null;
  }

  const points = getSnapshotPoints(snapshots, metric);

  if (!points || points.length < 3 || points.every((point) => point.value === points[0]?.value)) {
    return null;
  }

  const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const point = payload[0]?.payload as SnapshotPoint | undefined;
    if (!point) {
      return null;
    }

    const parsedDate = new Date(point.time);
    const formattedDate = Number.isNaN(parsedDate.getTime()) ? point.date : DATE_TOOLTIP_FORMATTER.format(parsedDate);

    return (
      <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
        <div>{formattedDate}</div>
        <div className="font-semibold">{point.value.toLocaleString('en-US')} stars</div>
      </div>
    );
  };

  return (
    <div className={cn(className, '[&_.recharts-surface:focus]:outline-none')}>
      <div className="mb-1 mt-1.5 text-xs font-medium text-muted-foreground">Total stars</div>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            height={16}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
            tickMargin={0}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => {
              const parsedDate = new Date(value);
              return Number.isNaN(parsedDate.getTime()) ? '' : DATE_TICK_FORMATTER.format(parsedDate);
            }}
          />
          <YAxis hide domain={['dataMin', 'dataMax + 1']} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default dynamic(() => Promise.resolve(ChartStarsSnapshot), {
  ssr: false,
});
