'use client';

import type { FC, ReactElement, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

import { formatAxisCount, formatMonthTick, monthTicks, seriesColor } from './org-pulse.utils';
import { cn } from '@/lib/utils';

export const CHART_HEIGHT = 240;

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' };

/** The month axis every Org Pulse chart shares: one category per month, ticks on Januaries (or quarters). */
export const monthAxisProps = (months: string[]) =>
  ({
    dataKey: 'month',
    type: 'category',
    ticks: monthTicks(months),
    interval: 0,
    tickFormatter: (month: string) => formatMonthTick(month, months.length),
    tickLine: false,
    axisLine: false,
    tick: AXIS_TICK,
    minTickGap: 8,
  }) as const;

export const countAxisProps = {
  tickFormatter: formatAxisCount,
  tickLine: false,
  axisLine: false,
  tick: AXIS_TICK,
  width: 44,
  allowDecimals: false,
} as const;

type ChartFrameProps = {
  /** What the chart shows, for screen readers: the figure's name. */
  label: string;
  className?: string;
  children: ReactElement;
};

/**
 * A chart's figure. The chart is a tab stop (recharts' accessibility layer moves the tooltip with
 * the arrow keys): the focus ring stays for keyboard focus and is hidden only after a click.
 */
export const ChartFrame: FC<ChartFrameProps> = ({ label, className, children }) => (
  <figure aria-label={label} className={cn('m-0 -ml-2', className)}>
    <ResponsiveContainer
      width="100%"
      height={CHART_HEIGHT}
      className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring"
    >
      {children}
    </ResponsiveContainer>
  </figure>
);

export const TooltipBox: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm min-w-48 max-w-80">
    {children}
  </div>
);

export const Swatch: FC<{ color: string; faded?: boolean; className?: string }> = ({ color, faded, className }) => (
  <span
    aria-hidden
    className={cn('inline-block size-2.5 shrink-0 rounded-sm', className)}
    style={{ backgroundColor: color, opacity: faded ? 0.5 : 1 }}
  />
);

/** The labels' colours, in the API's order (largest first), shared by both lines charts. */
export const SeriesLegend: FC<{ labels: string[] }> = ({ labels }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
    {labels.map((label, l) => (
      <li key={label} className="flex items-center gap-1.5">
        <Swatch color={seriesColor(label, l)} />
        {label}
      </li>
    ))}
  </ul>
);
