'use client';

import dynamic from 'next/dynamic';
import type { FC } from 'react';
import { Area, AreaChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { getBurstRanges, getStarHistoryPoints, type RepoHistory, type StarHistoryPoint } from '../utils/star-history';
import { formatNumberShort } from '@/utils/format-number-short';

type StarHistoryChartProps = {
  history: RepoHistory;
  burstMonths?: string[] | null;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: StarHistoryPoint }>;
};

const TICK_FORMATTER = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DATE_FORMATTER = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

const StarHistoryTooltip: FC<TooltipProps> = ({ active, payload }) => {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
      <div>{DATE_FORMATTER.format(point.time)}</div>
      <div className="font-semibold">{point.stars.toLocaleString('en-US')} stars</div>
    </div>
  );
};

const StarHistoryChart: FC<StarHistoryChartProps> = ({ history, burstMonths }) => {
  const points = getStarHistoryPoints(history);

  if (points.length < 2) {
    return null;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const bursts = getBurstRanges(burstMonths, first.time, last.time);

  return (
    <div className="[&_.recharts-surface:focus]:outline-none">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={points} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="star-history-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {bursts.map(({ x1, x2 }) => (
            <ReferenceArea key={x1} x1={x1} x2={x2} fill="var(--series-2)" fillOpacity={0.15} ifOverflow="hidden" />
          ))}
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => TICK_FORMATTER.format(value)}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickFormatter={formatNumberShort}
          />
          <Tooltip content={<StarHistoryTooltip />} />
          <Area
            type="monotone"
            dataKey="stars"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#star-history-fill)"
            isAnimationActive={false}
          />
          {last.current && (
            <ReferenceDot
              x={last.time}
              y={last.stars}
              r={4}
              fill="var(--series-1)"
              stroke="var(--background)"
              label={{ value: DATE_FORMATTER.format(last.time), position: 'left', fontSize: 11 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default dynamic(() => Promise.resolve(StarHistoryChart), {
  ssr: false,
});
