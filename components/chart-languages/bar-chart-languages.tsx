'use client';

import dynamic from 'next/dynamic';
import { FC } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatBytes } from '@/utils/format-bytes';
import { formatNumberShort } from '@/utils/format-number-short';

import { BarChartLanguagesProps, CartesianViewBox, CustomTooltipProps, ValueLabelProps } from './chart-languages.types';

const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const { name, score, size } = payload[0].payload ?? {};
    return (
      <div className="flex flex-col rounded-lg bg-background p-2 text-sm shadow-lg">
        <div className="font-medium">{name}</div>
        {!!score && <div>Score: {score.toLocaleString('en-US')} stars</div>}
        <div>Size: {formatBytes(size)}</div>
      </div>
    );
  }
  return null;
};

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

const BarChartLanguages: FC<BarChartLanguagesProps> = ({ languages, className }) => {
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
            <Cell key={`score-${l.name}`} fill={l.color} stroke={l.color} strokeWidth={1} />
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
            <Cell key={`size-${l.name}`} fill={l.color} fillOpacity={0.3} stroke={l.color} strokeWidth={1} />
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
