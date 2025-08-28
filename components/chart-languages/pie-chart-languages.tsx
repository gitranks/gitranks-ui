'use client';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { TIER_NAMES } from '@/app/app.consts';
import { formatBytes } from '@/utils/format-bytes';
import { lightenColor } from '@/utils/lighten-color';

const RADIUS = 70;
const MIN_RADIUS_FACTOR = 0.6;
const MIN_CELL_PERCENTAGE = 0.04;

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const { name, tier, size } = payload[0].payload ?? {};
    return (
      <div className="flex flex-col rounded-lg bg-background p-2 text-sm shadow-lg">
        <div className="font-medium">{name}</div>
        {!!tier && (
          <div>
            Rank: {TIER_NAMES[tier.tier - 1]} {tier.level}
          </div>
        )}
        <div>Size: {formatBytes(size)}</div>
      </div>
    );
  }
  return null;
};

export const PieChartLanguages = ({ languages }) => {
  const data = useMemo(() => {
    if (!languages?.length) return [];

    // Calculate total size
    const totalSize = languages.reduce((sum, l) => sum + l.size, 0);

    const minSize = totalSize * MIN_CELL_PERCENTAGE;

    // First, mark which languages are below the minimum
    let adjusted = languages.map((l) => ({
      ...l,
      adjustedSize: l.size < minSize ? minSize : l.size,
      isAdjusted: l.size < minSize,
    }));

    // Calculate the total "extra" size added by boosting small languages
    const extra = adjusted.reduce((sum, l) => sum + (l.isAdjusted ? minSize - l.size : 0), 0);

    // Calculate the sum of sizes of languages that are not adjusted
    const sumUnadjusted = adjusted.filter((l) => !l.isAdjusted).reduce((sum, l) => sum + l.size, 0);

    // Proportionally reduce the sizes of unadjusted languages
    adjusted = adjusted.map((l) => {
      if (!l.isAdjusted && sumUnadjusted > 0) {
        return {
          ...l,
          adjustedSize: l.size - (l.size / sumUnadjusted) * extra,
        };
      }
      return l;
    });

    // Now, continue with the rest of the logic, but use adjustedSize
    const languagesWithTier = adjusted.map(({ tiers, rank, adjustedSize, ...rest }) => {
      const tier = tiers.sTiers.find((t) => t.minValue <= rest.score);
      return {
        ...rest,
        tier,
        level: tier ? tier.tier * 5 + tier.level : 0,
        size: adjustedSize,
      };
    });

    const languagesSorted = [...languagesWithTier].sort((a, b) => b.level - a.level);

    let minRank = Infinity;
    let maxRank = -Infinity;
    for (const l of languagesSorted) {
      const s = l.level ?? 0;
      if (s < minRank) minRank = s;
      if (s > maxRank) maxRank = s;
    }

    const minRadius = RADIUS * MIN_RADIUS_FACTOR;
    const maxRadius = RADIUS;

    const rankRange = Math.max(1, maxRank - minRank); // щоб уникнути ділення на 0

    return languagesSorted.map((l) => {
      const t = (l.level - minRank) / rankRange; // 0..1
      const outerRadius = minRadius + t * (maxRadius - minRadius);

      return {
        name: l.name,
        color: l.color,
        outerRadius,
        size: l.size,
        tier: l.tier,
      };
    });
  }, [languages]);

  return (
    <PieChart height={RADIUS * 2} width={RADIUS * 2}>
      <Pie
        data={data}
        dataKey="size"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={(entry: any) => entry.outerRadius}
        startAngle={90}
        endAngle={-270}
      >
        {data.map((entry, i) => (
          <Cell key={`slice-${entry.name}-${i}`} fill={entry.color} stroke={lightenColor(entry.color, 0.4)} />
        ))}
      </Pie>

      <Tooltip content={<CustomTooltip />} />
    </PieChart>
  );
};
