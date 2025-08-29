'use client';

import dynamic from 'next/dynamic';
import { FC } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';
import { formatBytes } from '@/utils/format-bytes';
import { formatNumberShort } from '@/utils/format-number-short';

import { ChartLanguagesProps, CartesianViewBox, ValueLabelProps } from './chart-languages.types';
import { CustomTooltip } from './custom-tooltip';

const RightValueLabel: FC<ValueLabelProps> = ({ value, viewBox, formatter }) => {
  const { x = 0, y = 0, width = 0, height = 0 } = (viewBox ?? {}) as CartesianViewBox;

  const rightEdge = width >= 0 ? x + width : x;
  const cx = rightEdge + 6;
  const cy = y + height / 2;

  return (
    <text
      x={cx}
      y={cy + 1}
      textAnchor="start"
      dominantBaseline="middle"
      fontSize={12}
      fontWeight={400}
      className="fill-gray-900 dark:fill-gray-100"
    >
      {formatter ? formatter(value) : value}
    </text>
  );
};

const BarChartLanguages: FC<ChartLanguagesProps> = ({ languages, className }) => {
  if (!languages?.length) {
    return null;
  }

  return (
    <ResponsiveContainer height={120} width="100%" className={className}>
      <BarChart
        data={languages}
        barCategoryGap="10%"
        barGap={1}
        margin={{ right: 55 }}
        layout="vertical"
        maxBarSize={20}
      >
        <YAxis
          dataKey="name"
          type="category"
          width="auto"
          tickLine={false}
          axisLine={false}
          style={{ fill: 'currentColor' }}
        />

        <XAxis type="number" xAxisId="score" orientation="bottom" axisLine={false} tickLine={false} tick={false} hide />
        <XAxis type="number" xAxisId="size" orientation="top" axisLine={false} tickLine={false} tick={false} hide />

        <Tooltip content={<CustomTooltip />} cursor={false} />

        <Bar dataKey="score" xAxisId="score" name="Score" activeBar={false}>
          {languages.map((l) => (
            <Cell
              key={`score-${l.name}`}
              fill={l.color ?? DEFAULT_LANGUAGE_COLOR}
              stroke={l.color ?? DEFAULT_LANGUAGE_COLOR}
              strokeWidth={1}
            />
          ))}
          <LabelList
            dataKey="score"
            position="right"
            fontSize={11}
            content={<RightValueLabel formatter={(v) => `☆${formatNumberShort(v)}`} />}
          />
        </Bar>

        <Bar dataKey="size" xAxisId="size" name="Size" fillOpacity={0} activeBar={false}>
          {languages.map((l) => (
            <Cell
              key={`size-${l.name}`}
              fill={l.color ?? DEFAULT_LANGUAGE_COLOR}
              fillOpacity={0.3}
              stroke={l.color ?? DEFAULT_LANGUAGE_COLOR}
              strokeWidth={1}
            />
          ))}
          <LabelList dataKey="size" position="right" content={<RightValueLabel formatter={(v) => formatBytes(v)} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default dynamic(() => Promise.resolve(BarChartLanguages), {
  ssr: false,
});
