'use client';

import dynamic from 'next/dynamic';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatBytes } from '@/utils/format-bytes';
import { formatNumberShort } from '@/utils/format-number-short';

const CustomTooltip = ({ active, payload }) => {
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

// const BarChartLanguages = ({ languages }) => {
//   return (
//     <ResponsiveContainer height={140} width="100%">
//       <BarChart data={languages} barCategoryGap="30%" barGap={4}>
//         {/* <CartesianGrid strokeDasharray="3 3" /> */}
//         <XAxis dataKey="name" />
//         {/* Separate axes */}
//         {/* <YAxis yAxisId="left" />
//         <YAxis yAxisId="right" orientation="right" /> */}
//         <Tooltip content={<CustomTooltip />} />

//         {/* SCORE: filled bars, per-language color */}
//         <Bar dataKey="score" yAxisId="left" name="Score">
//           {languages.map((l) => (
//             <Cell key={`score-${l.name}`} fill={l.color} />
//           ))}
//         </Bar>

//         {/* SIZE: outlined bars, no fill, colored stroke */}
//         <Bar
//           dataKey="size"
//           yAxisId="right"
//           name="Size"
//           fillOpacity={0}
//           // keep a minimal transparent fill so bars render, stroke provided per Cell
//           isAnimationActive
//         >
//           {languages.map((l) => (
//             <Cell key={`size-${l.name}`} fill="transparent" stroke={l.color} strokeWidth={1} />
//           ))}
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// };

const RightValueLabel = (props: any) => {
  const { value, viewBox } = props;
  const { x = 0, y = 0, width = 0, height = 0 } = viewBox || {};

  // handle negative / zero widths too
  const rightEdge = width >= 0 ? x + width : x;
  const cx = rightEdge + 6; // gap to the right of bar
  const cy = y + height / 2; // vertically center on the bar

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
      {props.formatter ? props.formatter(value) : value}
    </text>
  );
};

const BarChartLanguages = ({ languages }) => {
  console.log(languages);
  return (
    <ResponsiveContainer height={120} width="100%">
      <BarChart data={languages} barCategoryGap="10%" barGap={1} margin={{ right: 44 }} layout="vertical">
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
          <LabelList dataKey="size" position="right" content={<RightValueLabel formatter={formatBytes} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// 👇 correct dynamic export
export default dynamic(() => Promise.resolve(BarChartLanguages), {
  ssr: false,
});
